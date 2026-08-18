import type { Station } from '#shared/schemas/station'
import { computeStationTelemetry } from '~~/server/services/telemetry-simulator'

/**
 * Helper di campionamento condivisi da chi aggrega la telemetria simulata nel
 * tempo (KPI, Giorno 13; grafici, Giorno 14): `computeStationTelemetry` è una
 * funzione pura di (stazione, istante), quindi campionarla a istanti diversi
 * produce uno storico plausibile senza persistere nulla (ADR-0002).
 */

export interface StatusCounts {
  available: number
  charging: number
  faulted: number
  offline: number
  total: number
}

export function countByStatus(stations: Station[], at: Date): StatusCounts {
  const counts: StatusCounts = { available: 0, charging: 0, faulted: 0, offline: 0, total: 0 }

  for (const station of stations) {
    const telemetry = computeStationTelemetry(station, at)
    for (const connector of telemetry.connectors) {
      counts.total += 1
      if (connector.status === 'Available') counts.available += 1
      else if (connector.status === 'Charging') counts.charging += 1
      else if (connector.status === 'Faulted') counts.faulted += 1
      else counts.offline += 1
    }
  }

  return counts
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Gli ultimi `days` giorni fino a `now` incluso (`now` è l'ultimo elemento). */
export function lastNDays(days: number, now: Date): Date[] {
  const dates: Date[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    dates.push(new Date(now.getTime() - i * DAY_MS))
  }
  return dates
}

/** Chiave di raggruppamento giornaliero da un ISO 8601: YYYY-MM-DD. */
export function dayKey(iso: string): string {
  return iso.slice(0, 10)
}
