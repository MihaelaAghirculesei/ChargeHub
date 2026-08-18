import type { Station } from '#shared/schemas/station'
import type { ChargePointTelemetry, StationTelemetry } from '#shared/schemas/telemetry'
import { chargingPowerFraction, integrateEnergyKwh } from '~~/server/utils/charging-curve'
import { round } from '~~/server/utils/number'
import { hashString, mulberry32 } from '~~/server/utils/random'

/**
 * Vercel è serverless (decisione bloccata, vedi ChargeHub.md §0): un'istanza
 * di funzione non sopravvive in modo affidabile tra un'invocazione e
 * l'altra, quindi non possiamo tenere una macchina a stati mutabile in
 * memoria guidata da `setInterval`. Il simulatore è invece una funzione pura
 * di (seed del connettore, timestamp corrente): niente da persistere, ma i
 * valori restano continui e credibili perché derivano dallo stesso seed e
 * dal tempo reale che passa. Vedi docs/adr/0002-telemetry-simulation.md.
 *
 * Hash/PRNG e curva di potenza sono in `server/utils/` perché il
 * simulatore di sessioni storiche (Giorno 12, `session-simulator.ts`) li
 * riusa: stessa "forma" di ricarica plausibile, non due curve inventate
 * separatamente.
 */

/** Potenza (kW) usata per simulare connettori senza un PowerKW noto da OCM. */
const DEFAULT_POWER_KW = 11

interface ConnectorProfile {
  /** Durata di un ciclo completo Available → Charging → coda, in secondi. */
  cycleLengthSeconds: number
  /** Quota del ciclo in stato Available prima della ricarica. */
  availableFraction: number
  /** Quota del ciclo passata a ricaricare. */
  chargingFraction: number
  /** Sfasa il ciclo di questo connettore rispetto agli altri (0..100000s). */
  phaseOffsetSeconds: number
  /** Determina, nella coda del ciclo, se questo connettore è meno affidabile. */
  reliabilityRoll: number
}

function deriveProfile(seedKey: string): ConnectorProfile {
  const random = mulberry32(hashString(seedKey))
  return {
    cycleLengthSeconds: 600 + Math.floor(random() * 1200),
    availableFraction: 0.3 + random() * 0.2,
    chargingFraction: 0.3 + random() * 0.2,
    phaseOffsetSeconds: Math.floor(random() * 100_000),
    reliabilityRoll: random()
  }
}

/** Percentuale del ciclo sotto la quale il roll di affidabilità causa un guasto. */
const FAULTED_THRESHOLD = 0.06
/** Percentuale del ciclo sotto la quale il roll di affidabilità causa un offline. */
const OFFLINE_THRESHOLD = 0.1

export function computeChargePointTelemetry(
  connectorId: number,
  seedKey: string,
  maxPowerKw: number,
  now: Date
): ChargePointTelemetry {
  const profile = deriveProfile(seedKey)
  const epochSeconds = Math.floor(now.getTime() / 1000)
  const cyclePosition =
    (((epochSeconds + profile.phaseOffsetSeconds) % profile.cycleLengthSeconds) +
      profile.cycleLengthSeconds) %
    profile.cycleLengthSeconds

  const availableEnd = profile.cycleLengthSeconds * profile.availableFraction
  const chargingEnd = availableEnd + profile.cycleLengthSeconds * profile.chargingFraction

  if (cyclePosition < availableEnd) {
    return {
      connectorId,
      status: 'Available',
      powerKw: null,
      sessionEnergyKwh: null,
      sessionDurationSeconds: null
    }
  }

  if (cyclePosition < chargingEnd) {
    const elapsed = cyclePosition - availableEnd
    const duration = chargingEnd - availableEnd
    const power = maxPowerKw * chargingPowerFraction(elapsed / duration)

    return {
      connectorId,
      status: 'Charging',
      powerKw: round(power, 1),
      sessionEnergyKwh: round(integrateEnergyKwh(elapsed, duration, maxPowerKw), 2),
      sessionDurationSeconds: Math.floor(elapsed)
    }
  }

  // Coda del ciclo: per lo più Available, occasionalmente Faulted/Offline in
  // base al roll (stabile per questo connettore, deciso dal seed).
  if (profile.reliabilityRoll < FAULTED_THRESHOLD) {
    return {
      connectorId,
      status: 'Faulted',
      powerKw: null,
      sessionEnergyKwh: null,
      sessionDurationSeconds: null
    }
  }
  if (profile.reliabilityRoll < OFFLINE_THRESHOLD) {
    return {
      connectorId,
      status: 'Offline',
      powerKw: null,
      sessionEnergyKwh: null,
      sessionDurationSeconds: null
    }
  }
  return {
    connectorId,
    status: 'Available',
    powerKw: null,
    sessionEnergyKwh: null,
    sessionDurationSeconds: null
  }
}

export function computeStationTelemetry(
  station: Station,
  now: Date = new Date()
): StationTelemetry {
  return {
    stationId: station.id,
    timestamp: now.toISOString(),
    connectors: station.connectors.map((connector) =>
      computeChargePointTelemetry(
        connector.id,
        `station-${station.id}-connector-${connector.id}`,
        connector.powerKw ?? DEFAULT_POWER_KW,
        now
      )
    )
  }
}
