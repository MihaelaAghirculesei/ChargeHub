import type { Station } from '#shared/schemas/station'
import type { ChargePointTelemetry, StationTelemetry } from '#shared/schemas/telemetry'

/**
 * Vercel è serverless (decisione bloccata, vedi ChargeHub.md §0): un'istanza
 * di funzione non sopravvive in modo affidabile tra un'invocazione e
 * l'altra, quindi non possiamo tenere una macchina a stati mutabile in
 * memoria guidata da `setInterval`. Il simulatore è invece una funzione pura
 * di (seed del connettore, timestamp corrente): niente da persistere, ma i
 * valori restano continui e credibili perché derivano dallo stesso seed e
 * dal tempo reale che passa. Vedi docs/adr/0002-telemetry-simulation.md.
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

/** Hash stringa → intero 32 bit, FNV-1a. Deterministico, nessuna dipendenza. */
function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** PRNG Mulberry32: da un seed intero produce una sequenza deterministica in [0,1). */
function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
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

/**
 * Frazione della potenza massima in funzione dell'avanzamento (0..1) della
 * sessione: alta e quasi piatta fino all'80%, poi decresce più ripida
 * (curva di ricarica plausibile, non lineare fino alla fine).
 */
function chargingPowerFraction(progress: number): number {
  const clamped = Math.min(Math.max(progress, 0), 1)
  if (clamped <= 0.8) {
    return 1 - 0.3 * (clamped / 0.8)
  }
  return 0.7 - 0.55 * ((clamped - 0.8) / 0.2)
}

/**
 * Energia (kWh) accumulata integrando numericamente la curva di potenza tra
 * 0 e `elapsedSeconds` (integrazione trapezoidale, 60 campioni: economica e
 * evita di dover fidarsi di un integrale in forma chiusa scritto a mano).
 */
function sessionEnergyKwh(
  elapsedSeconds: number,
  chargingDurationSeconds: number,
  maxPowerKw: number
): number {
  const steps = 60
  const stepSeconds = elapsedSeconds / steps
  let energy = 0

  for (let index = 0; index < steps; index += 1) {
    const t1 = index * stepSeconds
    const t2 = (index + 1) * stepSeconds
    const p1 = maxPowerKw * chargingPowerFraction(t1 / chargingDurationSeconds)
    const p2 = maxPowerKw * chargingPowerFraction(t2 / chargingDurationSeconds)
    energy += ((p1 + p2) / 2) * (stepSeconds / 3600)
  }

  return energy
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
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
      sessionEnergyKwh: round(sessionEnergyKwh(elapsed, duration, maxPowerKw), 2),
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
