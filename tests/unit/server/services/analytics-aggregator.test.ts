import { describe, expect, it } from 'vitest'
import type { ChargingSession } from '#shared/schemas/session'
import type { Station } from '#shared/schemas/station'
import { computeAnalytics } from '~~/server/services/analytics-aggregator'

function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    id: 1,
    uuid: 'uuid-1',
    name: 'Stazione test',
    operator: 'Enel X',
    address: {
      line1: 'Via Roma 1',
      line2: null,
      town: 'Milano',
      postcode: '20100',
      country: 'Italy',
      accessComments: null
    },
    latitude: 45.46,
    longitude: 9.19,
    connectors: [
      { id: 10, typeId: 1, type: 'Type 2', level: null, powerKw: 22, quantity: 1 },
      { id: 11, typeId: 2, type: 'CCS', level: null, powerKw: 50, quantity: 1 }
    ],
    maxPowerKw: 50,
    numberOfPoints: 2,
    operationalStatus: 'Operational',
    isOperational: true,
    lastVerified: '2024-01-01T00:00:00Z',
    usageType: 'Public',
    ...overrides
  }
}

function makeSession(overrides: Partial<ChargingSession> = {}): ChargingSession {
  return {
    id: 'session-1',
    stationId: 1,
    stationName: 'Stazione test',
    connectorId: 10,
    connectorType: 'Type 2',
    startedAt: '2026-08-18T09:00:00.000Z',
    endedAt: '2026-08-18T09:30:00.000Z',
    durationMinutes: 30,
    energyKwh: 5,
    averagePowerKw: 10,
    peakPowerKw: 22,
    costEur: 2.25,
    ...overrides
  }
}

const NOW = new Date('2026-08-18T12:00:00.000Z')

describe('computeAnalytics', () => {
  it('restituisce tutto a zero quando non ci sono stazioni', () => {
    const analytics = computeAnalytics([], [], 7, NOW)
    expect(analytics.energyByDay.every((p) => p.energyKwh === 0)).toBe(true)
    expect(analytics.statusDistribution.every((p) => p.count === 0)).toBe(true)
    expect(analytics.utilizationByHour.every((p) => p.utilizationPercent === 0)).toBe(true)
  })

  it('è deterministico: stesso input produce lo stesso output', () => {
    const stations = [makeStation()]
    const sessions = [makeSession()]
    const first = computeAnalytics(stations, sessions, 30, NOW)
    const second = computeAnalytics(stations, sessions, 30, NOW)
    expect(second).toEqual(first)
  })

  it('energyByDay ha una voce per ogni giorno del periodo richiesto', () => {
    for (const period of [7, 30, 90]) {
      const analytics = computeAnalytics([makeStation()], [], period, NOW)
      expect(analytics.energyByDay).toHaveLength(period)
    }
  })

  it('energyByDay somma le sessioni del giorno corrispondente e ignora le altre', () => {
    const sessions = [
      makeSession({ startedAt: '2026-08-18T08:00:00.000Z', energyKwh: 5 }),
      makeSession({ startedAt: '2026-08-18T10:00:00.000Z', energyKwh: 3 }),
      makeSession({ startedAt: '2026-08-17T08:00:00.000Z', energyKwh: 100 })
    ]
    const analytics = computeAnalytics([makeStation()], sessions, 7, NOW)
    const today = analytics.energyByDay.at(-1)!
    const yesterday = analytics.energyByDay.at(-2)!
    expect(today.date).toBe('2026-08-18')
    expect(today.energyKwh).toBe(8)
    expect(yesterday.date).toBe('2026-08-17')
    expect(yesterday.energyKwh).toBe(100)
  })

  it('energyByDay con un periodo di 90 giorni mostra zero al di fuori delle sessioni fornite, non le inventa', () => {
    const sessions = [makeSession({ startedAt: '2026-07-19T08:00:00.000Z', energyKwh: 42 })]
    const analytics = computeAnalytics([makeStation()], sessions, 90, NOW)
    const matching = analytics.energyByDay.find((p) => p.date === '2026-07-19')
    expect(matching?.energyKwh).toBe(42)
    const zeroCount = analytics.energyByDay.filter((p) => p.energyKwh === 0).length
    expect(zeroCount).toBe(analytics.energyByDay.length - 1)
  })

  it('statusDistribution copre i 4 stati e somma al numero di connettori totali, indipendentemente dal periodo', () => {
    const stations = [makeStation()]
    const distribution7 = computeAnalytics(stations, [], 7, NOW).statusDistribution
    const distribution90 = computeAnalytics(stations, [], 90, NOW).statusDistribution

    expect(distribution7.map((p) => p.status)).toEqual([
      'Available',
      'Charging',
      'Faulted',
      'Offline'
    ])
    const total = distribution7.reduce((sum, p) => sum + p.count, 0)
    expect(total).toBe(stations[0]!.connectors.length)
    // Non dipende dal periodo: è sempre lo stato "adesso".
    expect(distribution90).toEqual(distribution7)
  })

  it('utilizationByHour copre le 24 ore con percentuali valide', () => {
    const analytics = computeAnalytics([makeStation()], [], 7, NOW)
    expect(analytics.utilizationByHour).toHaveLength(24)
    expect(analytics.utilizationByHour.map((p) => p.hour)).toEqual(
      Array.from({ length: 24 }, (_, i) => i)
    )
    for (const point of analytics.utilizationByHour) {
      expect(point.utilizationPercent).toBeGreaterThanOrEqual(0)
      expect(point.utilizationPercent).toBeLessThanOrEqual(100)
    }
  })
})
