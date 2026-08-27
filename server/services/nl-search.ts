import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { ExtractedStationFilters, ReferenceData } from '#shared/schemas/station'

const MODEL = 'claude-haiku-4-5'

/**
 * Domain error for any failure talking to Claude — same pattern as
 * OcmClientError (ocm-client.ts): routes never propagate the provider's raw
 * message/stack, only a code mapped onto an HTTP error of our own.
 */
export class NlSearchError extends Error {
  constructor(
    message: string,
    public readonly code: 'not_configured' | 'upstream_error' | 'invalid_response',
    public override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'NlSearchError'
  }
}

export type { ExtractedStationFilters }

/**
 * A union of numeric literals from a list of real ids — not a generic
 * `z.number()`. Claude can then return *only* an id that actually exists in
 * the reference data just fetched from OCM (or `null`), never an invented id
 * or one from another country: the guarantee comes from the schema itself,
 * not from a prompt instruction the model could ignore.
 *
 * **Small lists only** (connectionTypes ~30, statusTypes ~10): `operatorId`
 * no longer uses this helper — for Germany OCM returns hundreds of
 * operators, and the API rejects the request with 400 ("The compiled
 * grammar is too large") once the literal union gets too big. Found with a
 * real call (no test below caught it: they mock the SDK, so the real
 * `messages.parse` + `output_config` path was never exercised) — see the
 * eval suite for the regression case with a large operator list. For
 * `operatorId` the same guarantee ("no invented id") is obtained by
 * validating the response *after* receiving it, not by constraining the
 * grammar up front — see `extractStationFilters`.
 */
export function idLiteralUnion(ids: number[]) {
  if (ids.length === 0) {
    throw new NlSearchError(
      'No reference data available from Open Charge Map to build the extraction schema.',
      'invalid_response'
    )
  }
  if (ids.length === 1) return z.literal(ids[0])
  return z.union(
    ids.map((id) => z.literal(id)) as [
      z.ZodLiteral<number>,
      z.ZodLiteral<number>,
      ...z.ZodLiteral<number>[]
    ]
  )
}

export function buildExtractionSchema(referenceData: ReferenceData) {
  return z.object({
    search: z
      .string()
      .nullable()
      .describe(
        'Free keywords not covered by the other fields (fragments of a station/operator name, an address). null if nothing free-form is left.'
      ),
    connectionTypeId: idLiteralUnion(referenceData.connectionTypes.map((c) => c.id))
      .nullable()
      .describe(
        'The requested connector type, as an id from the list provided. null if not specified.'
      ),
    // Plain z.number(), not idLiteralUnion (see the comment on
    // idLiteralUnion) — validated against referenceData.operators after the
    // response, in extractStationFilters.
    operatorId: z
      .number()
      .int()
      .nullable()
      .describe('The requested operator, as an id from the list provided. null if not specified.'),
    statusTypeId: idLiteralUnion(referenceData.statusTypes.map((s) => s.id))
      .nullable()
      .describe(
        'The requested operational status, as an id from the list provided. null if not specified.'
      ),
    minPowerKw: z
      .number()
      .nonnegative()
      .nullable()
      .describe(
        'If the query states an explicit number of kW, ALWAYS use that number, never an estimated value. Only when there is no explicit number, estimate from a vague term (e.g. "fast"/"schnell" ~50, "ultra fast"/"ultraschnell" ~150). null if there is no reference to power at all.'
      )
  })
}

function formatReferenceList(entries: { id: number; title: string }[]): string {
  return entries.map((entry) => `${entry.id}: ${entry.title}`).join('\n')
}

/**
 * Position (lat/lon/radius) is deliberately not among the extracted fields:
 * it is already the current map / filter-store state (days 6-8), and the
 * natural-language search adds criteria on top, it does not replace them —
 * see ADR-0007. Geocoding city names from free text is a different problem
 * (needs a separate geocoding service), explicitly out of scope here.
 *
 * The prompt is English while the queries it handles are German or English:
 * the instruction language and the input language are independent, and
 * English keeps it consistent with the rest of the codebase. Any edit here
 * is a behaviour change — re-run `pnpm eval:nl-search` (real model, 19
 * labelled cases) before merging it.
 */
function buildSystemPrompt(referenceData: ReferenceData): string {
  return `Extract structured search criteria from a natural-language query (German or English) about electric vehicle charging stations in Germany.

Available connector types (id: title):
${formatReferenceList(referenceData.connectionTypes)}

Available operators (id: title):
${formatReferenceList(referenceData.operators)}

Available operational statuses (id: title):
${formatReferenceList(referenceData.statusTypes)}

Use ONLY the ids listed above. If the query does not specify a criterion, return null for that field — do not guess.

Any reference to a place or city (e.g. "in Berlin", "near Munich") must be IGNORED ENTIRELY — do not copy it into the "search" field, the search location is already handled elsewhere. The "search" field is only for fragments of a station/operator name or an address that are not a city name, never for the city itself.`
}

export function assertConfigured(apiKey: string): void {
  if (!apiKey) {
    throw new NlSearchError(
      'ANTHROPIC_API_KEY is not configured — see .env.example.',
      'not_configured'
    )
  }
}

let cachedClient: Anthropic | undefined

function getClient(): Anthropic {
  if (cachedClient) return cachedClient

  const apiKey = useRuntimeConfig().anthropicApiKey
  assertConfigured(apiKey)

  cachedClient = new Anthropic({ apiKey })
  return cachedClient
}

export async function extractStationFilters(
  query: string,
  referenceData: ReferenceData,
  // Default parameter evaluated lazily only when omitted: the real route
  // never passes it (uses getClient()), tests pass a fake client and so
  // never touch useRuntimeConfig() / the assertConfigured guard.
  client: Anthropic = getClient()
): Promise<ExtractedStationFilters> {
  const schema = buildExtractionSchema(referenceData)

  let response
  try {
    response = await client.messages.parse({
      model: MODEL,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: buildSystemPrompt(referenceData),
          // The reference data is cached 24h on the OCM side
          // (defineCachedFunction, same TTL) and does not change between one
          // search and the next in the same window — cache_control avoids
          // paying for the whole prompt (which includes the full operator
          // list) on every single query.
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [{ role: 'user', content: query }],
      output_config: { format: zodOutputFormat(schema) }
    })
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new NlSearchError(
        'Filter extraction failed (Claude unreachable).',
        'upstream_error',
        error
      )
    }
    // Any other SDK error (`Anthropic.AnthropicError` is the base class of
    // `APIError`): non-JSON output, failed Zod validation of the output, a
    // response truncated by `max_tokens`. `messages.parse()` throws a bare
    // `AnthropicError` in these cases — without this branch it would
    // propagate as a 500 with the provider's message, breaking this file's
    // invariant. It is a *shape* problem with the response, same code as the
    // `!parsed_output` branch below.
    if (error instanceof Anthropic.AnthropicError) {
      throw new NlSearchError('Claude response in an unexpected format.', 'invalid_response', error)
    }
    throw error
  }

  if (!response.parsed_output) {
    throw new NlSearchError('Claude response in an unexpected format.', 'invalid_response')
  }

  const parsed = response.parsed_output
  // `operatorId` is not constrained by the schema (see idLiteralUnion) — the
  // "no invented id" guarantee applies here, not up front: an id outside the
  // real list becomes null, never propagated.
  const operatorId =
    parsed.operatorId != null &&
    referenceData.operators.some((operator) => operator.id === parsed.operatorId)
      ? parsed.operatorId
      : null

  // `parsed_output` types the `nullable()` fields as optional too (a detail
  // of the `zodOutputFormat` helper, not of our schema) — normalised here to
  // satisfy `ExtractedStationFilters`.
  return {
    search: parsed.search ?? null,
    connectionTypeId: parsed.connectionTypeId ?? null,
    operatorId,
    statusTypeId: parsed.statusTypeId ?? null,
    minPowerKw: parsed.minPowerKw ?? null
  }
}
