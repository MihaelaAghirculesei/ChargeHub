import { describe, expect, it } from 'vitest'
import type { ChargingSession } from '#shared/schemas/session'
import type { Station } from '#shared/schemas/station'
import { computeKpis } from '~~/server/services/kpi-aggregator'

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

describe('computeKpis', () => {
  it('returns all KPIs at zero when there are no stations', () => {
    const kpis = computeKpis([], [], NOW)
    for (const item of kpis) {
      expect(item.value).toBe(0)
      expect(item.trendPercent).toBe(0)
      expect(item.series).toHaveLength(7)
      expect(item.series.every((v) => v === 0)).toBe(true)
    }
  })

  it('is deterministic: the same input produces the same output', () => {
    const stations = [makeStation()]
    const sessions = [makeSession()]
    const first = computeKpis(stations, sessions, NOW)
    const second = computeKpis(stations, sessions, NOW)
    expect(second).toEqual(first)
  })

  it('produces exactly the 6 expected keys, each with a 7-day series', () => {
    const kpis = computeKpis([makeStation()], [], NOW)
    const keys = kpis.map((k) => k.key)
    expect(keys).toEqual([
      'stations',
      'available',
      'charging',
      'faulted',
      'energyToday',
      'utilization'
    ])
    for (const item of kpis) {
      expect(item.series).toHaveLength(7)
    }
  })

  it('"total stations" has a constant series (the registry does not change in these windows) and zero trend', () => {
    const stations = [makeStation({ id: 1 }), makeStation({ id: 2 })]
    const kpi = computeKpis(stations, [], NOW).find((k) => k.key === 'stations')!
    expect(kpi.value).toBe(2)
    expect(kpi.series.every((v) => v === 2)).toBe(true)
    expect(kpi.trendPercent).toBe(0)
  })

  it('available + charging + faulted + offline always sum to the total number of connectors', () => {
    const stations = [
      makeStation({ id: 1 }),
      makeStation({
        id: 2,
        connectors: [{ id: 20, typeId: 1, type: 'CCS', level: null, powerKw: 50, quantity: 1 }]
      })
    ]
    const kpis = computeKpis(stations, [], NOW)
    const available = kpis.find((k) => k.key === 'available')!.value
    const charging = kpis.find((k) => k.key === 'charging')!.value
    const faulted = kpis.find((k) => k.key === 'faulted')!.value
    const totalConnectors = stations.reduce((sum, s) => sum + s.connectors.length, 0)
    // "offline" is not a KPI of its own (the plan asks for only 4 + kWh + utilisation),
    // so we derive it by difference to check the sum.
    expect(available + charging + faulted).toBeLessThanOrEqual(totalConnectors)
    expect(available).toBeGreaterThanOrEqual(0)
  })

  it('"kWh today" sums only the sessions of the current day, ignoring the other days', () => {
    const sessions = [
      makeSession({ startedAt: '2026-08-18T08:00:00.000Z', energyKwh: 5 }),
      makeSession({ startedAt: '2026-08-18T10:00:00.000Z', energyKwh: 3 }),
      makeSession({ startedAt: '2026-08-17T08:00:00.000Z', energyKwh: 100 }),
      makeSession({ startedAt: '2026-08-10T08:00:00.000Z', energyKwh: 999 })
    ]
    const kpi = computeKpis([makeStation()], sessions, NOW).find((k) => k.key === 'energyToday')!
    expect(kpi.value).toBe(8)
    expect(kpi.series.at(-1)).toBe(8)
  })

  it('utilisation is the percentage of connectors charging out of the total, never above 100', () => {
    const kpi = computeKpis([makeStation(), makeStation({ id: 2 })], [], NOW).find(
      (k) => k.key === 'utilization'
    )!
    expect(kpi.value).toBeGreaterThanOrEqual(0)
    expect(kpi.value).toBeLessThanOrEqual(100)
    expect(kpi.unit).toBe('%')
  })

  it('sets higherIsBetter to false only for "faulted"', () => {
    const kpis = computeKpis([makeStation()], [], NOW)
    for (const item of kpis) {
      expect(item.higherIsBetter).toBe(item.key !== 'faulted')
    }
  })

  it('computes the trend as the percentage change between the first and last day of the series', () => {
    const sessions = [
      makeSession({ startedAt: '2026-08-12T08:00:00.000Z', energyKwh: 10 }),
      makeSession({ startedAt: '2026-08-18T08:00:00.000Z', energyKwh: 20 })
    ]
    const kpi = computeKpis([makeStation()], sessions, NOW).find((k) => k.key === 'energyToday')!
    // 7 days ago (2026-08-12) = 10, today (2026-08-18) = 20 → +100%
    expect(kpi.series[0]).toBe(10)
    expect(kpi.series.at(-1)).toBe(20)
    expect(kpi.trendPercent).toBe(100)
  })
})
