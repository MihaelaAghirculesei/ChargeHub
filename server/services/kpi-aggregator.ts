import type { ChargingSession } from '#shared/schemas/session'
import type { KpiSeries } from '#shared/schemas/kpi'
import type { Station } from '#shared/schemas/station'
import { computeStationTelemetry } from '~~/server/services/telemetry-simulator'
import { round } from '~~/server/utils/number'

/**
 * Compone dati già esistenti (registro stazioni, telemetria simulata,
 * sessioni sintetiche) in KPI con trend/sparkline — non un nuovo simulatore.
 * Lo storico a 7 giorni per i KPI "live" (disponibili/in ricarica/guasti/
 * utilizzo) sfrutta il fatto che `computeStationTelemetry` è una funzione
 * pura di (stazione, istante): campionare lo stesso istante nei 7 giorni
 * passati produce uno storico plausibile senza dover persistere nulla,
 * stesso principio del simulatore stesso (ADR-0002).
 */

const TREND_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

interface StatusCounts {
  available: number
  charging: number
  faulted: number
  offline: number
  total: number
}

function countByStatus(stations: Station[], at: Date): StatusCounts {
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

function lastNDays(days: number, now: Date): Date[] {
  const dates: Date[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    dates.push(new Date(now.getTime() - i * DAY_MS))
  }
  return dates
}

function dayKey(iso: string): string {
  return iso.slice(0, 10)
}

function trendPercent(series: number[]): number {
  const first = series[0]
  const last = series[series.length - 1]
  if (first === undefined || last === undefined || first === 0) return 0
  return round(((last - first) / first) * 100, 1)
}

function kpi(
  key: string,
  label: string,
  value: number,
  unit: string,
  higherIsBetter: boolean,
  series: number[]
): KpiSeries {
  return { key, label, value, unit, trendPercent: trendPercent(series), higherIsBetter, series }
}

export function computeKpis(
  stations: Station[],
  sessions: ChargingSession[],
  now: Date = new Date()
): KpiSeries[] {
  const days = lastNDays(TREND_DAYS, now)
  const dailyCounts = days.map((day) => countByStatus(stations, day))
  const current = dailyCounts.at(-1) ?? {
    available: 0,
    charging: 0,
    faulted: 0,
    offline: 0,
    total: 0
  }

  const availableSeries = dailyCounts.map((c) => c.available)
  const chargingSeries = dailyCounts.map((c) => c.charging)
  const faultedSeries = dailyCounts.map((c) => c.faulted)
  const utilizationSeries = dailyCounts.map((c) =>
    c.total === 0 ? 0 : round((c.charging / c.total) * 100, 1)
  )
  const stationsSeries = days.map(() => stations.length)

  const energyByDay = new Map<string, number>()
  for (const session of sessions) {
    const key = dayKey(session.startedAt)
    energyByDay.set(key, round((energyByDay.get(key) ?? 0) + session.energyKwh, 1))
  }
  const energySeries = days.map((day) => energyByDay.get(dayKey(day.toISOString())) ?? 0)

  return [
    kpi('stations', 'Stationen gesamt', stations.length, '', true, stationsSeries),
    kpi('available', 'Verfügbare Punkte', current.available, '', true, availableSeries),
    kpi('charging', 'In Ladung', current.charging, '', true, chargingSeries),
    kpi('faulted', 'Gestört', current.faulted, '', false, faultedSeries),
    kpi('energyToday', 'kWh heute', energySeries.at(-1) ?? 0, 'kWh', true, energySeries),
    kpi('utilization', 'Auslastung', utilizationSeries.at(-1) ?? 0, '%', true, utilizationSeries)
  ]
}
