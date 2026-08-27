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
        'Parole chiave libere non coperte dagli altri campi (frammenti di nome stazione/operatore, indirizzo). null se non resta nulla di libero.'
      ),
    connectionTypeId: idLiteralUnion(referenceData.connectionTypes.map((c) => c.id))
      .nullable()
      .describe(
        'Tipo di connettore richiesto, come id dalla lista fornita. null se non specificato.'
      ),
    // Plain z.number(), not idLiteralUnion (see the comment on
    // idLiteralUnion) — validated against referenceData.operators after the
    // response, in extractStationFilters.
    operatorId: z
      .number()
      .int()
      .nullable()
      .describe('Operatore richiesto, come id dalla lista fornita. null se non specificato.'),
    statusTypeId: idLiteralUnion(referenceData.statusTypes.map((s) => s.id))
      .nullable()
      .describe('Stato operativo richiesto, come id dalla lista fornita. null se non specificato.'),
    minPowerKw: z
      .number()
      .nonnegative()
      .nullable()
      .describe(
        'Se la query cita un numero esplicito di kW, usa SEMPRE quel numero, mai un valore stimato. Solo se non c\'è un numero esplicito, stima da un termine vago (es. "veloce" ~50, "ultra veloce" ~150). null se non c\'è alcun riferimento alla potenza.'
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
 * NOTE: the prompt string below and the `.describe()` strings above are
 * still Italian on purpose — they are tuned prompt content covered by the
 * eval suite (`pnpm eval:nl-search`), not code comments. Translating them is
 * a behaviour change and needs the eval suite re-run to confirm no
 * regression; tracked as a separate follow-up.
 */
function buildSystemPrompt(referenceData: ReferenceData): string {
  return `Estrai criteri di ricerca strutturati da una query in linguaggio naturale (tedesco o inglese) su stazioni di ricarica per veicoli elettrici in Germania.

Tipi di connettore disponibili (id: titolo):
${formatReferenceList(referenceData.connectionTypes)}

Operatori disponibili (id: titolo):
${formatReferenceList(referenceData.operators)}

Stati operativi disponibili (id: titolo):
${formatReferenceList(referenceData.statusTypes)}

Usa SOLO gli id elencati sopra. Se la query non specifica un criterio, restituisci null per quel campo — non indovinare.

Qualunque riferimento a una località/città (es. "a Berlino", "vicino a Monaco") va IGNORATO PER INTERO — non copiarlo nel campo "search", la posizione della ricerca è già gestita altrove. Il campo "search" è solo per frammenti di nome stazione/operatore o indirizzo che non sono un nome di città, non per la città stessa.`
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
