import type { ChargingSession } from '#shared/schemas/session'
import type { KpiSeries } from '#shared/schemas/kpi'
import type { Station } from '#shared/schemas/station'
import { countByStatus, dayKey, lastNDays } from '~~/server/utils/telemetry-aggregation'
import { round } from '~~/server/utils/number'

/**
 * Composes data that already exists (station registry, simulated telemetry,
 * synthetic sessions) into KPIs with trend/sparkline — not a new simulator.
 * The 7-day history for the "live" KPIs (available/charging/faulted/
 * utilisation) leans on `server/utils/telemetry-aggregation.ts` (the same
 * sampling logic reused by the day-14 charts).
 */

const TREND_DAYS = 7

function trendPercent(series: number[]): number {
  const first = series[0]
  const last = series[series.length - 1]
  if (first === undefined || last === undefined || first === 0) return 0
  return round(((last - first) / first) * 100, 1)
}

function kpi(
  key: string,
  value: number,
  unit: string,
  higherIsBetter: boolean,
  series: number[]
): KpiSeries {
  return { key, value, unit, trendPercent: trendPercent(series), higherIsBetter, series }
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
    kpi('stations', stations.length, '', true, stationsSeries),
    kpi('available', current.available, '', true, availableSeries),
    kpi('charging', current.charging, '', true, chargingSeries),
    kpi('faulted', current.faulted, '', false, faultedSeries),
    kpi('energyToday', energySeries.at(-1) ?? 0, 'kWh', true, energySeries),
    kpi('utilization', utilizationSeries.at(-1) ?? 0, '%', true, utilizationSeries)
  ]
}
