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

/** cycleLengthSeconds è sempre tra 600 e 1800: 3600s coprono almeno un ciclo intero. */
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
  it('è deterministico: stesso seed e stesso istante producono lo stesso risultato', () => {
    const now = new Date('2026-08-18T10:00:00Z')
    const first = computeChargePointTelemetry(1, SEED_A, MAX_POWER_KW, now)
    const second = computeChargePointTelemetry(1, SEED_A, MAX_POWER_KW, now)
    expect(second).toEqual(first)
  })

  it('attraversa sia Available che Charging nel corso di un ciclo', () => {
    const statuses = new Set(scanCycle(SEED_A, MAX_POWER_KW).map((sample) => sample.status))
    expect(statuses.has('Available')).toBe(true)
    expect(statuses.has('Charging')).toBe(true)
  })

  it('popola i campi di sessione solo quando lo stato è Charging', () => {
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

  it('la potenza decresce verso la fine della sessione (curva plausibile, non piatta né casuale)', () => {
    const charging = scanCycle(SEED_A, MAX_POWER_KW).filter(
      (sample) => sample.status === 'Charging'
    )
    expect(charging.length).toBeGreaterThan(2)
    const first = charging[0] as ChargePointTelemetry
    const last = charging[charging.length - 1] as ChargePointTelemetry
    expect(last.powerKw as number).toBeLessThan(first.powerKw as number)
  })

  it("l'energia di sessione cresce in modo monotono finché la sessione prosegue", () => {
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

  it('due connettori diversi (seed diversi) non restano sincronizzati sullo stesso stato', () => {
    const samplesA = scanCycle(SEED_A, MAX_POWER_KW, 3600, 30)
    const samplesB = scanCycle(SEED_B, MAX_POWER_KW, 3600, 30)
    const anyDifferent = samplesA.some((sample, index) => sample.status !== samplesB[index]?.status)
    expect(anyDifferent).toBe(true)
  })

  it('chiamando due volte a pochi secondi di distanza durante una ricarica, i valori cambiano in modo credibile', () => {
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
    // credibile, non un salto casuale: la potenza resta nello stesso ordine di grandezza
    expect(Math.abs((laterSameSession.powerKw as number) - (early.powerKw as number))).toBeLessThan(
      MAX_POWER_KW
    )
  })
})

describe('computeStationTelemetry', () => {
  it('produce una riga di telemetria per ogni connettore della stazione', () => {
    const station = makeStation()
    const now = new Date('2026-08-18T10:00:00Z')
    const telemetry = computeStationTelemetry(station, now)

    expect(telemetry.stationId).toBe(station.id)
    expect(telemetry.timestamp).toBe(now.toISOString())
    expect(telemetry.connectors).toHaveLength(2)
    expect(telemetry.connectors.map((connector) => connector.connectorId)).toEqual([10, 11])
  })

  it('usa una potenza di default plausibile per i connettori senza PowerKW noto da OCM', () => {
    const station = makeStation({
      connectors: [
        { id: 99, typeId: null, type: 'Unbekannt', level: null, powerKw: null, quantity: 1 }
      ]
    })

    // Scansiona il tempo finché il connettore risulta in ricarica: senza un
    // PowerKW noto deve comunque simulare una sessione plausibile, non
    // restare sempre inattivo.
    let foundCharging: ChargePointTelemetry | undefined
    for (let t = 0; t < 3600 && !foundCharging; t += 5) {
      const [sample] = computeStationTelemetry(station, new Date(t * 1000)).connectors
      if (sample?.status === 'Charging') foundCharging = sample
    }

    expect(foundCharging).toBeDefined()
    expect(foundCharging?.powerKw as number).toBeGreaterThan(0)
  })
})
