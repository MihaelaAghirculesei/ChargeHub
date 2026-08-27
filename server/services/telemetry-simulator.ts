import type { Station } from '#shared/schemas/station'
import type { ChargePointTelemetry, StationTelemetry } from '#shared/schemas/telemetry'
import { chargingPowerFraction, integrateEnergyKwh } from '~~/server/utils/charging-curve'
import { round } from '~~/server/utils/number'
import { hashString, mulberry32 } from '~~/server/utils/random'

/**
 * Vercel is serverless (locked decision, see ChargeHub.md §0): a function
 * instance does not reliably survive between one invocation and the next, so
 * we cannot keep a mutable state machine in memory driven by `setInterval`.
 * The simulator is instead a pure function of (connector seed, current
 * timestamp): nothing to persist, but the values stay continuous and
 * believable because they derive from the same seed and from real time
 * passing. See docs/adr/0002-telemetry-simulation.md.
 *
 * Hash/PRNG and the power curve live in `server/utils/` because the
 * historical session simulator (day 12, `session-simulator.ts`) reuses
 * them: the same plausible charging "shape", not two curves invented
 * separately.
 */

/** Power (kW) used to simulate connectors with no PowerKW known from OCM. */
const DEFAULT_POWER_KW = 11

interface ConnectorProfile {
  /** Length of a full Available → Charging → tail cycle, in seconds. */
  cycleLengthSeconds: number
  /** Share of the cycle spent Available before charging. */
  availableFraction: number
  /** Share of the cycle spent charging. */
  chargingFraction: number
  /** Offsets this connector's cycle relative to the others (0..100000s). */
  phaseOffsetSeconds: number
  /** Decides, in the cycle tail, whether this connector is less reliable. */
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

/** Reliability-roll value below which the connector is Faulted. */
const FAULTED_THRESHOLD = 0.06
/** Reliability-roll value below which the connector is Offline. */
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

  // Cycle tail: mostly Available, occasionally Faulted/Offline based on the
  // roll (stable for this connector, decided by the seed).
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
