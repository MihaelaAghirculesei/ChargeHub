import { describe, expect, it } from 'vitest'
import type { Station } from '#shared/schemas/station'
import { generateSessions } from '~~/server/services/session-simulator'

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
    connectors: [{ id: 10, typeId: 1, type: 'Type 2', level: null, powerKw: 22, quantity: 1 }],
    maxPowerKw: 22,
    numberOfPoints: 1,
    operationalStatus: 'Operational',
    isOperational: true,
    lastVerified: '2024-01-01T00:00:00Z',
    usageType: 'Public',
    ...overrides
  }
}

const NOW = new Date('2026-08-18T12:00:00.000Z')

describe('generateSessions', () => {
  it('returns an empty array when there are no stations', () => {
    expect(generateSessions([], { now: NOW })).toEqual([])
  })

  it('ignores stations with no connectors', () => {
    const station = makeStation({ connectors: [] })
    expect(generateSessions([station], { now: NOW })).toEqual([])
  })

  it('is deterministic: the same input produces the same output', () => {
    const stations = [makeStation()]
    const first = generateSessions(stations, { count: 50, now: NOW })
    const second = generateSessions(stations, { count: 50, now: NOW })
    expect(second).toEqual(first)
  })

  it('generates exactly `count` sessions when there is at least one valid station', () => {
    const stations = [makeStation()]
    const sessions = generateSessions(stations, { count: 200, now: NOW })
    expect(sessions).toHaveLength(200)
  })

  it('each session references a real station/connector, with plausible duration and energy', () => {
    const stationA = makeStation({ id: 1, name: 'Stazione A' })
    const stationB = makeStation({
      id: 2,
      name: 'Stazione B',
      connectors: [{ id: 20, typeId: 2, type: 'CCS', level: null, powerKw: 50, quantity: 1 }]
    })
    const sessions = generateSessions([stationA, stationB], {
      count: 300,
      lookbackDays: 30,
      now: NOW
    })

    const knownStationIds = new Set([stationA.id, stationB.id])
    const knownConnectorIds = new Set([10, 20])
    const lookbackMs = 30 * 24 * 60 * 60 * 1000

    for (const session of sessions) {
      expect(knownStationIds.has(session.stationId)).toBe(true)
      expect(knownConnectorIds.has(session.connectorId)).toBe(true)
      expect(session.durationMinutes).toBeGreaterThanOrEqual(10)
      expect(session.durationMinutes).toBeLessThan(90)
      expect(session.energyKwh).toBeGreaterThan(0)
      expect(session.averagePowerKw).toBeGreaterThan(0)
      expect(session.peakPowerKw).toBeGreaterThanOrEqual(session.averagePowerKw)
      expect(session.costEur).toBeGreaterThan(0)

      const startedAt = new Date(session.startedAt).getTime()
      const endedAt = new Date(session.endedAt).getTime()
      expect(startedAt).toBeLessThanOrEqual(NOW.getTime())
      expect(startedAt).toBeGreaterThanOrEqual(NOW.getTime() - lookbackMs)
      expect(endedAt - startedAt).toBe(session.durationMinutes * 60_000)
    }
  })

  it('uses a default power for connectors with no PowerKW known from OCM', () => {
    const station = makeStation({
      connectors: [
        { id: 99, typeId: null, type: 'Unbekannt', level: null, powerKw: null, quantity: 1 }
      ]
    })
    const sessions = generateSessions([station], { count: 20, now: NOW })
    expect(sessions.length).toBeGreaterThan(0)
    for (const session of sessions) {
      expect(session.energyKwh).toBeGreaterThan(0)
    }
  })

  it('sorts the sessions from most recent to least recent', () => {
    const sessions = generateSessions([makeStation()], { count: 100, now: NOW })
    for (let index = 1; index < sessions.length; index += 1) {
      const previous = sessions[index - 1] as (typeof sessions)[number]
      const current = sessions[index] as (typeof sessions)[number]
      expect(previous.startedAt >= current.startedAt).toBe(true)
    }
  })
})
