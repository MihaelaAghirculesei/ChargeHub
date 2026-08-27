import type { Station } from '#shared/schemas/station'
import type { ChargingSession } from '#shared/schemas/session'
import { chargingPowerFraction, integrateEnergyKwh } from '~~/server/utils/charging-curve'
import { round } from '~~/server/utils/number'
import { hashString, mulberry32 } from '~~/server/utils/random'

/**
 * Synthetic history of completed sessions for the day-12 table — not an
 * extension of the live telemetry simulator (day 10, a single "now" state
 * per connector): here we need a row volume independent of the number of
 * real connectors, to demonstrate table virtualisation. Each session is
 * generated from an index (0..count-1) with the same seed approach as
 * `telemetry-simulator.ts` — deterministic, not accumulated in state — and
 * reuses the same power curve
 * (`chargingPowerFraction`/`integrateEnergyKwh`) to stay consistent with
 * what live telemetry shows for a charge in progress.
 */

/** Target number of sessions: the figure cited by the plan's "Done when" criterion (smooth scroll over 2000 rows), not a realistic occupancy estimate. */
const DEFAULT_SESSION_COUNT = 2000
const DEFAULT_LOOKBACK_DAYS = 30
const DEFAULT_POWER_KW = 11
/** Placeholder until a real tariffs module exists (day 15). */
const PRICE_PER_KWH_EUR = 0.45

const MIN_DURATION_MINUTES = 10
const MAX_DURATION_MINUTES = 90

export interface GenerateSessionsOptions {
  count?: number
  lookbackDays?: number
  now?: Date
}

export function generateSessions(
  stations: Station[],
  options: GenerateSessionsOptions = {}
): ChargingSession[] {
  const eligibleStations = stations.filter((station) => station.connectors.length > 0)
  if (eligibleStations.length === 0) return []

  const count = options.count ?? DEFAULT_SESSION_COUNT
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS
  const now = options.now ?? new Date()
  const lookbackMs = lookbackDays * 24 * 60 * 60 * 1000

  const sessions: ChargingSession[] = []

  for (let index = 0; index < count; index += 1) {
    const random = mulberry32(hashString(`session-${index}`))

    const station = eligibleStations[Math.floor(random() * eligibleStations.length)]
    if (!station) continue
    const connector = station.connectors[Math.floor(random() * station.connectors.length)]
    if (!connector) continue

    const startedAt = new Date(now.getTime() - random() * lookbackMs)
    const durationMinutes =
      MIN_DURATION_MINUTES + Math.floor(random() * (MAX_DURATION_MINUTES - MIN_DURATION_MINUTES))
    const durationSeconds = durationMinutes * 60
    const endedAt = new Date(startedAt.getTime() + durationSeconds * 1000)

    const maxPowerKw = connector.powerKw ?? DEFAULT_POWER_KW
    // Elapsed === duration: integrate over the whole session, not over an
    // intermediate instant like live telemetry does for a charge in progress.
    const energyKwh = integrateEnergyKwh(durationSeconds, durationSeconds, maxPowerKw)
    const averagePowerKw = (energyKwh * 3600) / durationSeconds
    const peakPowerKw = maxPowerKw * chargingPowerFraction(0)

    sessions.push({
      id: `session-${index}`,
      stationId: station.id,
      stationName: station.name,
      connectorId: connector.id,
      connectorType: connector.type,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMinutes,
      energyKwh: round(energyKwh, 2),
      averagePowerKw: round(averagePowerKw, 1),
      peakPowerKw: round(peakPowerKw, 1),
      costEur: round(energyKwh * PRICE_PER_KWH_EUR, 2)
    })
  }

  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}
