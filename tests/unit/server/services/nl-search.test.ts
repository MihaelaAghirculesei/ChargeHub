import Anthropic from '@anthropic-ai/sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReferenceData } from '#shared/schemas/station'

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => {
  // Rispecchia la gerarchia reale dell'SDK: APIError estende AnthropicError
  // (la classe base). `messages.parse()` lancia un AnthropicError grezzo, non
  // un APIError, quando l'output del modello non è JSON valido o non passa la
  // validazione Zod.
  class MockAnthropicError extends Error {}
  class MockAPIError extends MockAnthropicError {}
  class MockAnthropic {
    static AnthropicError = MockAnthropicError
    static APIError = MockAPIError
    messages = { parse: parseMock }
  }
  return { default: MockAnthropic }
})

vi.mock('@anthropic-ai/sdk/helpers/zod', () => ({
  zodOutputFormat: (schema: unknown) => ({ type: 'json_schema', schema })
}))

const {
  assertConfigured,
  buildExtractionSchema,
  extractStationFilters,
  idLiteralUnion,
  NlSearchError
} = await import('~~/server/services/nl-search')

// Finto client passato esplicitamente a extractStationFilters(): bypassa
// getClient()/useRuntimeConfig() del tutto, non serve una vera chiave — vedi
// il parametro `client` opzionale sulla funzione.
const mockClient = new Anthropic({ apiKey: 'unused-in-tests' })

const referenceData: ReferenceData = {
  connectionTypes: [
    { id: 25, title: 'CCS (Type 2)' },
    { id: 2, title: 'CHAdeMO' }
  ],
  operators: [{ id: 10, title: 'Ionity' }],
  statusTypes: [{ id: 50, title: 'Operational', isOperational: true }]
}

describe('idLiteralUnion', () => {
  it('accetta un id valido e rifiuta uno non nella lista', () => {
    const schema = idLiteralUnion([25, 2])
    expect(schema.safeParse(25).success).toBe(true)
    expect(schema.safeParse(2).success).toBe(true)
    expect(schema.safeParse(999).success).toBe(false)
  })

  it('con un solo id, accetta solo quello', () => {
    const schema = idLiteralUnion([10])
    expect(schema.safeParse(10).success).toBe(true)
    expect(schema.safeParse(11).success).toBe(false)
  })

  it('lancia NlSearchError se la lista è vuota', () => {
    expect(() => idLiteralUnion([])).toThrow(NlSearchError)
  })
})

describe('buildExtractionSchema', () => {
  it('accetta solo gli id davvero presenti nei dati di riferimento', () => {
    const schema = buildExtractionSchema(referenceData)

    const valid = schema.safeParse({
      search: null,
      connectionTypeId: 25,
      operatorId: 10,
      statusTypeId: 50,
      minPowerKw: 50
    })
    expect(valid.success).toBe(true)

    const invalid = schema.safeParse({
      search: null,
      connectionTypeId: 999, // non nella lista di riferimento
      operatorId: 10,
      statusTypeId: 50,
      minPowerKw: 50
    })
    expect(invalid.success).toBe(false)
  })

  it('operatorId non è vincolato dallo schema (a differenza di connectionTypeId/statusTypeId): la grammatica di structured output resterebbe troppo grande con centinaia di operatori reali — la garanzia "nessun id inventato" si applica dopo, in extractStationFilters', () => {
    const schema = buildExtractionSchema(referenceData)
    const result = schema.safeParse({
      search: null,
      connectionTypeId: null,
      operatorId: 999999, // non nella lista, ma lo schema non lo respinge qui
      statusTypeId: null,
      minPowerKw: null
    })
    expect(result.success).toBe(true)
  })

  it('accetta tutti i campi null (nessun criterio riconosciuto)', () => {
    const schema = buildExtractionSchema(referenceData)
    const result = schema.safeParse({
      search: null,
      connectionTypeId: null,
      operatorId: null,
      statusTypeId: null,
      minPowerKw: null
    })
    expect(result.success).toBe(true)
  })
})

describe('assertConfigured', () => {
  it('lancia NlSearchError con code not_configured per una chiave vuota', () => {
    expect(() => assertConfigured('')).toThrow(NlSearchError)
    try {
      assertConfigured('')
    } catch (error) {
      expect(error).toBeInstanceOf(NlSearchError)
      expect((error as InstanceType<typeof NlSearchError>).code).toBe('not_configured')
    }
  })

  it('non lancia per una chiave presente', () => {
    expect(() => assertConfigured('sk-ant-test')).not.toThrow()
  })
})

describe('extractStationFilters', () => {
  beforeEach(() => {
    parseMock.mockClear()
  })

  it('normalizza i campi undefined del provider in null', async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        search: 'schnell',
        connectionTypeId: 25
        // operatorId/statusTypeId/minPowerKw omessi apposta, come farebbe l'SDK per i campi nullable
      }
    })

    const result = await extractStationFilters('ricarica veloce CCS', referenceData, mockClient)

    expect(result).toEqual({
      search: 'schnell',
      connectionTypeId: 25,
      operatorId: null,
      statusTypeId: null,
      minPowerKw: null
    })
  })

  it('azzera operatorId a null se Claude restituisce un id fuori dalla lista di riferimento reale', async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        search: null,
        connectionTypeId: null,
        operatorId: 999999, // non presente in referenceData.operators (solo id 10)
        statusTypeId: null,
        minPowerKw: null
      }
    })

    const result = await extractStationFilters('query qualunque', referenceData, mockClient)

    expect(result.operatorId).toBeNull()
  })

  it('lancia NlSearchError invalid_response se parsed_output è assente', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: null })

    await expect(
      extractStationFilters('query qualunque', referenceData, mockClient)
    ).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })

  it('mappa un errore Anthropic.APIError su NlSearchError upstream_error', async () => {
    parseMock.mockRejectedValueOnce(new Anthropic.APIError('boom'))

    await expect(
      extractStationFilters('query qualunque', referenceData, mockClient)
    ).rejects.toMatchObject({
      code: 'upstream_error'
    })
  })

  it('mappa un Anthropic.AnthropicError non-APIError (output malformato/troncato) su NlSearchError invalid_response, non lo lascia risalire grezzo', async () => {
    parseMock.mockRejectedValueOnce(
      new Anthropic.AnthropicError('Failed to parse structured output: ...')
    )

    await expect(
      extractStationFilters('query qualunque', referenceData, mockClient)
    ).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })

  it('passa il contenuto della query e usa cache_control sul system prompt', async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        search: null,
        connectionTypeId: null,
        operatorId: null,
        statusTypeId: null,
        minPowerKw: null
      }
    })

    await extractStationFilters('ricarica a Wolfsburg', referenceData, mockClient)

    const call = parseMock.mock.calls[0]?.[0]
    expect(call.messages).toEqual([{ role: 'user', content: 'ricarica a Wolfsburg' }])
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' })
  })
})
