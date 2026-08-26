import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { ExtractedStationFilters, ReferenceData } from '#shared/schemas/station'

const MODEL = 'claude-haiku-4-5'

/**
 * Errore di dominio per qualunque fallimento nel parlare con Claude — stesso
 * pattern di OcmClientError (ocm-client.ts): le rotte non propagano mai il
 * messaggio/stack grezzo del provider, solo un codice mappato su un errore
 * HTTP proprio.
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
 * Unione di literal numerici da una lista di id reali — non un `z.number()`
 * generico. Claude può quindi restituire *solo* un id che esiste davvero
 * nei dati di riferimento appena recuperati da OCM (o `null`), niente id
 * inventati o di un altro paese: la garanzia viene dallo schema stesso, non
 * da un'istruzione nel prompt che il modello potrebbe ignorare.
 *
 * **Solo per liste piccole** (connectionTypes ~30, statusTypes ~10):
 * `operatorId` NON usa più questo helper — per la Germania OCM restituisce
 * centinaia di operatori, e l'API rifiuta la richiesta con 400 ("The
 * compiled grammar is too large") quando l'union di literal diventa troppo
 * grande. Trovato con una chiamata reale (nessun test qui sotto lo
 * intercettava: mockano l'SDK, quindi il path `messages.parse` +
 * `output_config` vero non veniva mai esercitato) — vedi la eval suite per
 * il caso di regressione con una lista operatori grande. Per `operatorId`
 * la stessa garanzia ("nessun id inventato") si ottiene validando la
 * risposta *dopo* averla ricevuta, non vincolando la grammatica in anticipo
 * — vedi `extractStationFilters`.
 */
export function idLiteralUnion(ids: number[]) {
  if (ids.length === 0) {
    throw new NlSearchError(
      'Nessun dato di riferimento disponibile da Open Charge Map per costruire lo schema di estrazione.',
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
    // z.number() semplice, non idLiteralUnion (vedi il commento su
    // idLiteralUnion) — validato contro referenceData.operators dopo la
    // risposta, in extractStationFilters.
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
 * La posizione (lat/lon/raggio) non è tra i campi estratti apposta: è già
 * lo stato corrente della mappa/store filtri (Giorno 6-8), la ricerca in
 * linguaggio naturale aggiunge criteri sopra, non li sostituisce — vedi
 * ADR-0007. Geocodificare nomi di città dal testo libero è un problema
 * diverso (serve un servizio di geocoding a parte), esplicitamente fuori
 * scope qui.
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
      'ANTHROPIC_API_KEY non configurata — vedi .env.example.',
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
  // Parametro di default valutato pigramente solo se omesso: la rotta reale
  // non lo passa mai (usa getClient()), i test passano un client finto e
  // così non toccano mai useRuntimeConfig()/il guard assertConfigured.
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
          // I dati di riferimento sono cachati 24h lato OCM (defineCachedFunction,
          // stesso TTL) e non cambiano tra una ricerca e l'altra nella stessa
          // finestra — cache_control evita di ripagare l'intero prompt (che
          // include l'elenco di tutti gli operatori) a ogni singola query.
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [{ role: 'user', content: query }],
      output_config: { format: zodOutputFormat(schema) }
    })
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new NlSearchError(
        'Estrazione filtri fallita (Claude non raggiungibile).',
        'upstream_error',
        error
      )
    }
    // Ogni altro errore dell'SDK (`Anthropic.AnthropicError` è la classe
    // base di `APIError`): output non-JSON, validazione Zod dell'output
    // fallita, risposta troncata da `max_tokens`. `messages.parse()` lancia
    // un `AnthropicError` grezzo in questi casi — senza questo ramo
    // risalirebbe come 500 col messaggio del provider, rompendo l'invariante
    // di questo file. È un problema di *forma* della risposta, stesso codice
    // del ramo `!parsed_output` più sotto.
    if (error instanceof Anthropic.AnthropicError) {
      throw new NlSearchError(
        'Risposta di Claude in un formato inatteso.',
        'invalid_response',
        error
      )
    }
    throw error
  }

  if (!response.parsed_output) {
    throw new NlSearchError('Risposta di Claude in un formato inatteso.', 'invalid_response')
  }

  const parsed = response.parsed_output
  // `operatorId` non è vincolato dallo schema (vedi idLiteralUnion) — la
  // garanzia "nessun id inventato" si applica qui, non in anticipo:
  // un id fuori dalla lista reale diventa null, mai propagato.
  const operatorId =
    parsed.operatorId != null &&
    referenceData.operators.some((operator) => operator.id === parsed.operatorId)
      ? parsed.operatorId
      : null

  // `parsed_output` tipizza i campi `nullable()` come anche opzionali (un
  // dettaglio dell'helper `zodOutputFormat`, non del nostro schema) —
  // normalizzato qui per rispettare `ExtractedStationFilters`.
  return {
    search: parsed.search ?? null,
    connectionTypeId: parsed.connectionTypeId ?? null,
    operatorId,
    statusTypeId: parsed.statusTypeId ?? null,
    minPowerKw: parsed.minPowerKw ?? null
  }
}
