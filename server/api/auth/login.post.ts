import { z } from 'zod'
import { getAuthSession, MOCK_ACCOUNTS } from '~~/server/utils/auth-session'

const bodySchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  // `xForwardedFor: true`: the real caller IP arrives via `X-Forwarded-For`
  // behind Vercel's proxy, not as a direct socket address. Trustworthy on
  // Vercel specifically: it overwrites this header at the edge and does not
  // forward whatever a client sent (verified against Vercel's docs) — that
  // guarantee would not hold behind a different/unknown proxy.
  const clientIp = getRequestIP(event, { xForwardedFor: true })

  // No fallback bucket for an unresolved IP: sharing one key across
  // unrelated callers would let one of them lock out all the others.
  if (clientIp) {
    const reservation = loginRateLimiter.reserve(clientIp)
    if (reservation.blocked) {
      setResponseHeader(event, 'Retry-After', reservation.retryAfterSeconds)
      throw createError({
        statusCode: 429,
        statusMessage: 'Zu viele Versuche. Bitte später erneut versuchen.'
      })
    }
  }

  const parsed = await readValidatedBody(event, (body) => bodySchema.safeParse(body))

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Benutzername und Passwort erforderlich.' })
  }

  const account = MOCK_ACCOUNTS[parsed.data.username]
  if (!account || account.password !== parsed.data.password) {
    throw createError({ statusCode: 401, statusMessage: 'Benutzername oder Passwort falsch.' })
  }

  if (clientIp) loginRateLimiter.recordSuccess(clientIp)

  const session = await getAuthSession(event)
  await session.update({ username: parsed.data.username, role: account.role })

  return session.data
})
