import { describe, expect, it } from 'vitest'
import type { Station } from '#shared/schemas/station'
import type { ChargePointTelemetry } from '#shared/schemas/telemetry'
import {
  computeChargePointTelemetry,
  computeStationTelemetry
} from '~~/server/services/telemetry-simulator'

const SEED_A = 'station-1-connector-10'
const SEED_B = 'station-1-connector-11'
const MAX_POWER_KW = 22

/** cycleLengthSeconds is always between 600 and 1800: 3600s covers at least one full cycle. */
function scanCycle(
  seedKey: string,
  maxPowerKw: number,
  spanSeconds = 3600,
  stepSeconds = 5
): ChargePointTelemetry[] {
  const samples: ChargePointTelemetry[] = []
  for (let t = 0; t < spanSeconds; t += stepSeconds) {
    samples.push(computeChargePointTelemetry(1, seedKey, maxPowerKw, new Date(t * 1000)))
  }
  return samples
}

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
      { id: 11, typeId: 2, type: 'CCS', level: null, powerKw: null, quantity: 1 }
    ],
    maxPowerKw: 22,
    numberOfPoints: 1,
    operationalStatus: 'Operational',
    isOperational: true,
    lastVerified: '2024-01-01T00:00:00Z',
    usageType: 'Public',
    ...overrides
  }
}

describe('computeChargePointTelemetry', () => {
  it('is deterministic: the same seed and the same instant produce the same result', () => {
    const now = new Date('2026-08-18T10:00:00Z')
    const first = computeChargePointTelemetry(1, SEED_A, MAX_POWER_KW, now)
    const second = computeChargePointTelemetry(1, SEED_A, MAX_POWER_KW, now)
    expect(second).toEqual(first)
  })

  it('goes through both Available and Charging over the course of a cycle', () => {
    const statuses = new Set(scanCycle(SEED_A, MAX_POWER_KW).map((sample) => sample.status))
    expect(statuses.has('Available')).toBe(true)
    expect(statuses.has('Charging')).toBe(true)
  })

  it('populates the session fields only when the status is Charging', () => {
    for (const sample of scanCycle(SEED_A, MAX_POWER_KW)) {
      if (sample.status === 'Charging') {
        expect(sample.powerKw).not.toBeNull()
        expect(sample.sessionEnergyKwh).not.toBeNull()
        expect(sample.sessionDurationSeconds).not.toBeNull()
        expect(sample.powerKw as number).toBeGreaterThan(0)
        expect(sample.powerKw as number).toBeLessThanOrEqual(MAX_POWER_KW)
      } else {
        expect(sample.powerKw).toBeNull()
        expect(sample.sessionEnergyKwh).toBeNull()
        expect(sample.sessionDurationSeconds).toBeNull()
      }
    }
  })

  it('power decreases towards the end of the session (a plausible curve, not flat or random)', () => {
    const charging = scanCycle(SEED_A, MAX_POWER_KW).filter(
      (sample) => sample.status === 'Charging'
    )
    expect(charging.length).toBeGreaterThan(2)
    const first = charging[0] as ChargePointTelemetry
    const last = charging[charging.length - 1] as ChargePointTelemetry
    expect(last.powerKw as number).toBeLessThan(first.powerKw as number)
  })

  it('session energy grows monotonically as long as the session continues', () => {
    const charging = scanCycle(SEED_A, MAX_POWER_KW).filter(
      (sample) => sample.status === 'Charging'
    )
    for (let index = 1; index < charging.length; index += 1) {
      const previous = charging[index - 1] as ChargePointTelemetry
      const current = charging[index] as ChargePointTelemetry
      if (
        (current.sessionDurationSeconds as number) > (previous.sessionDurationSeconds as number)
      ) {
        expect(current.sessionEnergyKwh as number).toBeGreaterThanOrEqual(
          previous.sessionEnergyKwh as number
        )
      }
    }
  })

  it('two different connectors (different seeds) do not stay synced on the same status', () => {
    const samplesA = scanCycle(SEED_A, MAX_POWER_KW, 3600, 30)
    const samplesB = scanCycle(SEED_B, MAX_POWER_KW, 3600, 30)
    const anyDifferent = samplesA.some((sample, index) => sample.status !== samplesB[index]?.status)
    expect(anyDifferent).toBe(true)
  })

  it('calling twice a few seconds apart during a charge, the values change believably', () => {
    const charging = scanCycle(SEED_A, MAX_POWER_KW, 3600, 5).filter(
      (sample) => sample.status === 'Charging'
    )
    const early = charging[0] as ChargePointTelemetry
    const laterSameSession = charging.find(
      (sample) =>
        (sample.sessionDurationSeconds as number) > (early.sessionDurationSeconds as number)
    ) as ChargePointTelemetry

    expect(laterSameSession.powerKw).not.toBeNull()
    expect(laterSameSession.sessionEnergyKwh as number).toBeGreaterThan(
      early.sessionEnergyKwh as number
    )
    // believable, not a random jump: the power stays in the same order of magnitude
    expect(Math.abs((laterSameSession.powerKw as number) - (early.powerKw as number))).toBeLessThan(
      MAX_POWER_KW
    )
  })
})

describe('computeStationTelemetry', () => {
  it('produces one telemetry row per connector of the station', () => {
    const station = makeStation()
    const now = new Date('2026-08-18T10:00:00Z')
    const telemetry = computeStationTelemetry(station, now)

    expect(telemetry.stationId).toBe(station.id)
    expect(telemetry.timestamp).toBe(now.toISOString())
    expect(telemetry.connectors).toHaveLength(2)
    expect(telemetry.connectors.map((connector) => connector.connectorId)).toEqual([10, 11])
  })

  it('uses a plausible default power for connectors with no PowerKW known from OCM', () => {
    const station = makeStation({
      connectors: [
        { id: 99, typeId: null, type: 'Unbekannt', level: null, powerKw: null, quantity: 1 }
      ]
    })

    // Scan time until the connector is charging: with no known PowerKW it
    // must still simulate a plausible session, not stay idle forever.
    let foundCharging: ChargePointTelemetry | undefined
    for (let t = 0; t < 3600 && !foundCharging; t += 5) {
      const [sample] = computeStationTelemetry(station, new Date(t * 1000)).connectors
      if (sample?.status === 'Charging') foundCharging = sample
    }

    expect(foundCharging).toBeDefined()
    expect(foundCharging?.powerKw as number).toBeGreaterThan(0)
  })
})
