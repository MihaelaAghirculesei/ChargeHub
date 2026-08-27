import Anthropic from '@anthropic-ai/sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReferenceData } from '#shared/schemas/station'

const { parseMock } = vi.hoisted(() => ({ parseMock: vi.fn() }))

vi.mock('@anthropic-ai/sdk', () => {
  // Mirrors the real SDK hierarchy: APIError extends AnthropicError (the base
  // class). `messages.parse()` throws a bare AnthropicError, not an APIError,
  // when the model output is not valid JSON or fails Zod validation.
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

// Fake client passed explicitly to extractStationFilters(): bypasses
// getClient()/useRuntimeConfig() entirely, no real key needed — see the
// optional `client` parameter on the function.
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
  it('accepts a valid id and rejects one not in the list', () => {
    const schema = idLiteralUnion([25, 2])
    expect(schema.safeParse(25).success).toBe(true)
    expect(schema.safeParse(2).success).toBe(true)
    expect(schema.safeParse(999).success).toBe(false)
  })

  it('with a single id, accepts only that one', () => {
    const schema = idLiteralUnion([10])
    expect(schema.safeParse(10).success).toBe(true)
    expect(schema.safeParse(11).success).toBe(false)
  })

  it('throws NlSearchError when the list is empty', () => {
    expect(() => idLiteralUnion([])).toThrow(NlSearchError)
  })
})

describe('buildExtractionSchema', () => {
  it('accepts only ids actually present in the reference data', () => {
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
      connectionTypeId: 999, // not in the reference list
      operatorId: 10,
      statusTypeId: 50,
      minPowerKw: 50
    })
    expect(invalid.success).toBe(false)
  })

  it('operatorId is not constrained by the schema (unlike connectionTypeId/statusTypeId): the structured-output grammar would be too large with hundreds of real operators — the "no invented id" guarantee applies later, in extractStationFilters', () => {
    const schema = buildExtractionSchema(referenceData)
    const result = schema.safeParse({
      search: null,
      connectionTypeId: null,
      operatorId: 999999, // not in the list, but the schema does not reject it here
      statusTypeId: null,
      minPowerKw: null
    })
    expect(result.success).toBe(true)
  })

  it('accepts all fields null (no criterion recognised)', () => {
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
  it('throws NlSearchError with code not_configured for an empty key', () => {
    expect(() => assertConfigured('')).toThrow(NlSearchError)
    try {
      assertConfigured('')
    } catch (error) {
      expect(error).toBeInstanceOf(NlSearchError)
      expect((error as InstanceType<typeof NlSearchError>).code).toBe('not_configured')
    }
  })

  it('does not throw for a present key', () => {
    expect(() => assertConfigured('sk-ant-test')).not.toThrow()
  })
})

describe('extractStationFilters', () => {
  beforeEach(() => {
    parseMock.mockClear()
  })

  it("normalises the provider's undefined fields to null", async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        search: 'schnell',
        connectionTypeId: 25
        // operatorId/statusTypeId/minPowerKw omitted on purpose, as the SDK would for nullable fields
      }
    })

    const result = await extractStationFilters('fast CCS charging', referenceData, mockClient)

    expect(result).toEqual({
      search: 'schnell',
      connectionTypeId: 25,
      operatorId: null,
      statusTypeId: null,
      minPowerKw: null
    })
  })

  it('resets operatorId to null when Claude returns an id outside the real reference list', async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        search: null,
        connectionTypeId: null,
        operatorId: 999999, // not present in referenceData.operators (only id 10)
        statusTypeId: null,
        minPowerKw: null
      }
    })

    const result = await extractStationFilters('any query', referenceData, mockClient)

    expect(result.operatorId).toBeNull()
  })

  it('throws NlSearchError invalid_response when parsed_output is absent', async () => {
    parseMock.mockResolvedValueOnce({ parsed_output: null })

    await expect(
      extractStationFilters('any query', referenceData, mockClient)
    ).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })

  it('maps an Anthropic.APIError to NlSearchError upstream_error', async () => {
    parseMock.mockRejectedValueOnce(new Anthropic.APIError('boom'))

    await expect(
      extractStationFilters('any query', referenceData, mockClient)
    ).rejects.toMatchObject({
      code: 'upstream_error'
    })
  })

  it('maps a non-APIError Anthropic.AnthropicError (malformed/truncated output) to NlSearchError invalid_response, does not let it propagate raw', async () => {
    parseMock.mockRejectedValueOnce(
      new Anthropic.AnthropicError('Failed to parse structured output: ...')
    )

    await expect(
      extractStationFilters('any query', referenceData, mockClient)
    ).rejects.toMatchObject({
      code: 'invalid_response'
    })
  })

  it('passes the query content and uses cache_control on the system prompt', async () => {
    parseMock.mockResolvedValueOnce({
      parsed_output: {
        search: null,
        connectionTypeId: null,
        operatorId: null,
        statusTypeId: null,
        minPowerKw: null
      }
    })

    await extractStationFilters('charging in Wolfsburg', referenceData, mockClient)

    const call = parseMock.mock.calls[0]?.[0]
    expect(call.messages).toEqual([{ role: 'user', content: 'charging in Wolfsburg' }])
    expect(call.system[0].cache_control).toEqual({ type: 'ephemeral' })
  })
})
