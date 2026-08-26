import { z } from 'zod'
import { OcmClientError, fetchReferenceData } from '~~/server/services/ocm-client'
import { NlSearchError, extractStationFilters } from '~~/server/services/nl-search'

const bodySchema = z.object({
  query: z.string().trim().min(1).max(300),
  // Deve essere un vero codice paese alpha-2: `z.string().length(2)` da solo
  // lasciava passare "12" o "!!" fino a `fetchReferenceData()` e come chiave
  // della cache di riferimento (24h), che accumulerebbe voci spazzatura.
  countrycode: z
    .string()
    .regex(/^[a-z]{2}$/i, 'Codice paese non valido.')
    .default('DE')
})

/**
 * Cost protection is layered on purpose (ADR-0007). None of the in-process
 * guards below is a hard guarantee — the hard ceiling is the spend limit on
 * the Anthropic workspace. These just make sure normal use never gets near
 * it and a script gets slowed down early:
 *   1. response cache    — identical repeated queries never re-hit Claude,
 *      and never spend a rate-limit or daily-cap slot either
 *   2. per-IP rate limit — cheap, catches the naive hammer from one client
 *   3. global daily cap  — bounds total spend when an attack is spread over
 *      many IPs (which layer 2 cannot see)
 */
export default defineEventHandler(async (event) => {
  const clientIp = getRequestIP(event, { xForwardedFor: true })

  const parsedBody = await readValidatedBody(event, (body) => bodySchema.safeParse(body))
  if (!parsedBody.success) {
    throw createError({ statusCode: 400, statusMessage: 'Query non valida.' })
  }

  const { query, countrycode } = parsedBody.data

  // Cache hit: serve without touching the per-IP limit, the daily cap or
  // Claude at all. An identical repeated query costs nothing, so it must not
  // count against the caller's per-minute budget.
  const cacheKey = nlSearchCacheKey(countrycode, query)
  const cached = nlSearchCache.get(cacheKey)
  if (cached) {
    return { filters: cached }
  }

  // Per-IP limit only on a real cache miss — i.e. a request that will reach
  // Claude. Single `reserve()` call (check + increment in one sync step, no
  // split status()/record pair across an `await` — that was the login
  // TOCTOU, see rate-limiter.ts). A flood of malformed bodies is already
  // rejected above with a 400 and never reaches Claude, so it needs no
  // limit here. No `recordSuccess()` reset on a hit, unlike login: a
  // successful search has a real (small) cost, so successes *should* count.
  if (clientIp) {
    const reservation = nlSearchRateLimiter.reserve(clientIp)
    if (reservation.blocked) {
      setResponseHeader(event, 'Retry-After', reservation.retryAfterSeconds)
      throw createError({ statusCode: 429, statusMessage: 'Troppe ricerche. Riprova tra poco.' })
    }
  }

  let dailyCapReserved = false
  try {
    const referenceData = await fetchReferenceData(countrycode)

    // Only requests that would genuinely reach Claude consume a daily-cap
    // slot — after validation, after the cache miss. `reserve()` checks and
    // increments in one synchronous call, so placing it past an `await` is
    // safe: what caused the login TOCTOU was a split check/record pair, not
    // the timing (see rate-limiter.ts).
    const daily = nlSearchDailyCap.reserve(NL_SEARCH_DAILY_CAP_KEY)
    if (daily.blocked) {
      setResponseHeader(event, 'Retry-After', daily.retryAfterSeconds)
      throw createError({
        statusCode: 429,
        statusMessage:
          'Limite giornaliero di ricerche in linguaggio naturale raggiunto. Usa i filtri classici.',
        data: { code: 'daily_cap' }
      })
    }
    dailyCapReserved = true

    const filters = await extractStationFilters(query, referenceData)
    nlSearchCache.set(cacheKey, filters)
    return { filters }
  } catch (error) {
    if (error instanceof NlSearchError) {
      // `upstream_error` = Anthropic rejected the request (`APIError`) and
      // did not bill it — give the daily-cap slot back so a transient
      // outage cannot drain the global budget with zero successful
      // extractions. `invalid_response` (malformed/truncated output) may
      // still have been billed for the tokens it generated, so that slot
      // stays spent.
      if (dailyCapReserved && error.code === 'upstream_error') {
        nlSearchDailyCap.release(NL_SEARCH_DAILY_CAP_KEY)
      }
      const statusCode = error.code === 'not_configured' ? 503 : 502
      throw createError({ statusCode, statusMessage: error.message, data: { code: error.code } })
    }
    if (error instanceof OcmClientError) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Impossibile recuperare le tabelle di riferimento da Open Charge Map.',
        data: { code: error.code }
      })
    }
    throw error
  }
})
