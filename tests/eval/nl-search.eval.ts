import Anthropic from '@anthropic-ai/sdk'
import { beforeAll, describe, expect, it } from 'vitest'
import { extractStationFilters } from '~~/server/services/nl-search'
import { evalReferenceData, evalReferenceDataManyOperators } from './fixtures'

/**
 * Eval suite per l'estrazione filtri (ADR-0007): 18 query etichettate a
 * mano contro i veri id di `evalReferenceData`, eseguite sul modello reale
 * (Claude Haiku 4.5) — non mockato, a differenza di
 * tests/unit/server/services/nl-search.test.ts (che testa la logica dello
 * schema/normalizzazione, non l'accuratezza dell'estrazione in sé). Costa
 * denaro reale (~18 chiamate) e non è deterministico al 100% — per questo
 * è fuori da `pnpm test`/dal gate CI, si esegue a mano con
 * `pnpm eval:nl-search` quando si cambia il prompt o il modello.
 *
 * `it.each` così ogni caso appare come una riga di report separata
 * (X passati/Y falliti), non un singolo blob pass/fail — è il punto di una
 * eval suite: sapere *quali* query falliscono, non solo se la suite passa.
 *
 * `client` costruito qui, non `getClient()` del servizio: quest'ultimo
 * legge `useRuntimeConfig()`, che nell'ambiente vitest "nuxt" non espone i
 * campi privati di runtimeConfig (comportamento realistico lato client,
 * vedi nota in nl-search.test.ts) — uno script che gira fuori da una vera
 * richiesta Nitro legge la chiave direttamente da `process.env`.
 */
let client: Anthropic

beforeAll(() => {
  const apiKey = process.env.NUXT_ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      "NUXT_ANTHROPIC_API_KEY non impostata nell'ambiente — esporta la stessa chiave di .env prima di lanciare `pnpm eval:nl-search`."
    )
  }
  client = new Anthropic({ apiKey })
})

interface Case {
  query: string
  /** `toEqual` se `strict`, `toMatchObject` altrimenti (solo i campi elencati contano — vedi i casi ambigui più sotto). */
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
    note: 'statusTypeId potrebbe essere 10 o 50 a seconda di come Claude legge "verfügbar" — controlliamo solo i campi rilevanti.'
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
    note: 'Nessun criterio: verifica che il modello non inventi filtri quando non ce ne sono.'
  },
  {
    query: 'Ladestationen in Berlin',
    expected: { search: null },
    strict: false,
    note: 'La località va ignorata per intero (ADR-0007), non finire in "search" come testo libero.'
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
    note: '"Schnelllader" non ha una soglia kW esplicita — non forziamo un valore minPowerKw specifico.'
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
    note: 'Query in inglese — il prompt dichiara di accettare sia tedesco sia inglese.'
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
    note: 'Tre criteri combinati nella stessa query.'
  },
  {
    query: 'kaputte Ladesäulen',
    expected: { statusTypeId: 100 },
    strict: false,
    note: 'Sinonimo colloquiale di "nicht funktionieren", non il termine ufficiale OCM.'
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
    note: 'Nessun criterio strutturato riconoscibile: deve ricadere per intero su "search" come testo libero.'
  }
]

describe('eval: estrazione filtri in linguaggio naturale', () => {
  it.each(cases)('$query', async ({ query, expected, strict }) => {
    const result = await extractStationFilters(query, evalReferenceData, client)

    if (strict) {
      expect(result).toEqual(expected)
    } else {
      expect(result).toMatchObject(expected)
    }
  })
})

describe('eval: regressione — lista operatori grande (500, scala reale ~984 per la Germania)', () => {
  it('non fallisce con 400 "grammar too large" e ignora un id fuori lista', async () => {
    const result = await extractStationFilters(
      'Ladestationen mit CCS Typ 2',
      evalReferenceDataManyOperators,
      client
    )

    expect(result.connectionTypeId).toBe(33)
    expect(result.operatorId).toBeNull()
  })
})
