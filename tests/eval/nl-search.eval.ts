import Anthropic from '@anthropic-ai/sdk'
import { beforeAll, describe, expect, it } from 'vitest'
import { extractStationFilters } from '~~/server/services/nl-search'
import { evalReferenceData, evalReferenceDataManyOperators } from './fixtures'

/**
 * Eval suite for filter extraction (ADR-0007): 18 hand-labelled queries
 * against the real ids of `evalReferenceData`, run on the real model
 * (Claude Haiku 4.5) — not mocked, unlike
 * tests/unit/server/services/nl-search.test.ts (which tests the schema /
 * normalisation logic, not extraction accuracy itself). It costs real money
 * (~18 calls) and is not 100% deterministic — that is why it is outside
 * `pnpm test` / the CI gate, run by hand with `pnpm eval:nl-search` when the
 * prompt or the model changes.
 *
 * `it.each` so each case shows up as its own report row (X passed / Y
 * failed), not a single pass/fail blob — that is the point of an eval suite:
 * knowing *which* queries fail, not just whether the suite passes.
 *
 * `client` built here, not the service's `getClient()`: the latter reads
 * `useRuntimeConfig()`, which under the vitest "nuxt" env does not expose the
 * private runtimeConfig fields (realistic client-side behaviour, see the note
 * in nl-search.test.ts) — a script running outside a real Nitro request
 * reads the key straight from `process.env`.
 */
let client: Anthropic

beforeAll(() => {
  const apiKey = process.env.NUXT_ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'NUXT_ANTHROPIC_API_KEY is not set in the environment — export the same key as in .env before running `pnpm eval:nl-search`.'
    )
  }
  client = new Anthropic({ apiKey })
})

interface Case {
  query: string
  /** `toEqual` when `strict`, `toMatchObject` otherwise (only the listed fields matter — see the ambiguous cases below). */
  expected:
    | {
        search: string | null
        connectionTypeId: number | null
        operatorId: number | null
        statusTypeId: number | null
        minPowerKw: number | null
      }
    | Partial<{
        search: string | null
        connectionTypeId: number | null
        operatorId: number | null
        statusTypeId: number | null
        minPowerKw: number | null
      }>
  strict: boolean
  note?: string
}

const cases: Case[] = [
  {
    query: 'Ladestationen von Ionity',
    expected: {
      search: null,
      connectionTypeId: null,
      operatorId: 3299,
      statusTypeId: null,
      minPowerKw: null
    },
    strict: true
  },
  {
    query: 'CCS Typ 2 Ladepunkte',
    expected: {
      search: null,
      connectionTypeId: 33,
      operatorId: null,
      statusTypeId: null,
      minPowerKw: null
    },
    strict: true
  },
  {
    query: 'Schnellladestationen mit mindestens 150 kW',
    expected: {
      search: null,
      connectionTypeId: null,
      operatorId: null,
      statusTypeId: null,
      minPowerKw: 150
    },
    strict: true
  },
  {
    query: 'verfügbare Ladesäulen von EnBW',
    expected: { operatorId: 86, statusTypeId: 10 },
    strict: false,
    note: 'statusTypeId could be 10 or 50 depending on how Claude reads "verfügbar" — we only check the relevant fields.'
  },
  {
    query: 'alle Stationen',
    expected: {
      search: null,
      connectionTypeId: null,
      operatorId: null,
      statusTypeId: null,
      minPowerKw: null
    },
    strict: true,
    note: 'No criterion: checks the model does not invent filters when there are none.'
  },
  {
    query: 'Ladestationen in Berlin',
    expected: { search: null },
    strict: false,
    note: 'The location must be ignored entirely (ADR-0007), not end up in "search" as free text.'
  },
  {
    query: 'CHAdeMO Ladepunkte von Allego',
    expected: {
      search: null,
      connectionTypeId: 2,
      operatorId: 103,
      statusTypeId: null,
      minPowerKw: null
    },
    strict: true
  },
  {
    query: 'Stationen die gerade nicht funktionieren',
    expected: { statusTypeId: 100 },
    strict: false
  },
  {
    query: 'geplante Ladestationen',
    expected: { statusTypeId: 150 },
    strict: false
  },
  {
    query: 'stillgelegte Ladepunkte',
    expected: { statusTypeId: 200 },
    strict: false
  },
  {
    query: 'FastNed Schnelllader',
    expected: { operatorId: 74 },
    strict: false,
    note: '"Schnelllader" has no explicit kW threshold — we do not force a specific minPowerKw value.'
  },
  {
    query: 'fast chargers over 100kW',
    expected: {
      search: null,
      connectionTypeId: null,
      operatorId: null,
      statusTypeId: null,
      minPowerKw: 100
    },
    strict: true,
    note: 'English query — the prompt states it accepts both German and English.'
  },
  {
    query: 'Shell Recharge Ladestationen',
    expected: {
      search: null,
      connectionTypeId: null,
      operatorId: 156,
      statusTypeId: null,
      minPowerKw: null
    },
    strict: true
  },
  {
    query: 'Type 1 Stecker',
    expected: {
      search: null,
      connectionTypeId: 1,
      operatorId: null,
      statusTypeId: null,
      minPowerKw: null
    },
    strict: true
  },
  {
    query: 'Aral pulse Schnellladesäulen',
    expected: { operatorId: 3455 },
    strict: false
  },
  {
    query: 'Ladepunkte mit CCS Typ 2 und mindestens 50 kW von EnBW',
    expected: {
      search: null,
      connectionTypeId: 33,
      operatorId: 86,
      statusTypeId: null,
      minPowerKw: 50
    },
    strict: true,
    note: 'Three criteria combined in the same query.'
  },
  {
    query: 'kaputte Ladesäulen',
    expected: { statusTypeId: 100 },
    strict: false,
    note: 'Colloquial synonym of "nicht funktionieren", not the official OCM term.'
  },
  {
    query: 'Hauptstraße 5',
    expected: {
      search: 'Hauptstraße 5',
      connectionTypeId: null,
      operatorId: null,
      statusTypeId: null,
      minPowerKw: null
    },
    strict: true,
    note: 'No recognisable structured criterion: must fall back entirely to "search" as free text.'
  }
]

describe('eval: natural-language filter extraction', () => {
  it.each(cases)('$query', async ({ query, expected, strict }) => {
    const result = await extractStationFilters(query, evalReferenceData, client)

    if (strict) {
      expect(result).toEqual(expected)
    } else {
      expect(result).toMatchObject(expected)
    }
  })
})

describe('eval: regression — large operator list (500, real scale ~984 for Germany)', () => {
  it('does not fail with 400 "grammar too large" and ignores an id outside the list', async () => {
    const result = await extractStationFilters(
      'Ladestationen mit CCS Typ 2',
      evalReferenceDataManyOperators,
      client
    )

    expect(result.connectionTypeId).toBe(33)
    expect(result.operatorId).toBeNull()
  })
})
