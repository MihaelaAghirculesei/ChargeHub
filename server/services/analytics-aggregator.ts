import type {
  AnalyticsData,
  DailyEnergyPoint,
  HourlyUtilizationPoint,
  StatusDistributionPoint
} from '#shared/schemas/analytics'
import type { ChargingSession } from '#shared/schemas/session'
import type { Station } from '#shared/schemas/station'
import { countByStatus, dayKey, lastNDays } from '~~/server/utils/telemetry-aggregation'
import { round } from '~~/server/utils/number'

/**
 * Data for the 3 day-14 charts, composed from data that already exists
 * (synthetic sessions, day 12; simulated telemetry, day 10) — no new
 * simulator, same principle as the KPI aggregator (day 13).
 */

/**
 * kWh/day for the last `periodDays`. Our synthetic session history only
 * exists for the last 30 days (`generateSessions`, default `lookbackDays:
 * 30`, day 12): selecting 90 days correctly shows zero before that window,
 * we do not fabricate it.
 */
function computeEnergyByDay(sessions: ChargingSession[], days: Date[]): DailyEnergyPoint[] {
  const energyByDay = new Map<string, number>()
  for (const session of sessions) {
    const key = dayKey(session.startedAt)
    energyByDay.set(key, round((energyByDay.get(key) ?? 0) + session.energyKwh, 1))
  }

  return days.map((day) => {
    const key = dayKey(day.toISOString())
    return { date: key, energyKwh: energyByDay.get(key) ?? 0 }
  })
}

/**
 * Current distribution of connector statuses: always "now", does not depend
 * on the selected period — a point-in-time snapshot, not an aggregate over a
 * time window (unlike the other two charts).
 */
function computeStatusDistribution(stations: Station[], now: Date): StatusDistributionPoint[] {
  const counts = countByStatus(stations, now)
  return [
    { status: 'Available', count: counts.available },
    { status: 'Charging', count: counts.charging },
    { status: 'Faulted', count: counts.faulted },
    { status: 'Offline', count: counts.offline }
  ]
}

/**
 * Average utilisation per hour of day (0-23), averaged over the days of the
 * selected period: for each hour, sample telemetry at that hour on each day
 * and average — a "typical day", more stable with longer periods (90 days
 * smooths more noise than 7).
 */
function computeUtilizationByHour(stations: Station[], days: Date[]): HourlyUtilizationPoint[] {
  const points: HourlyUtilizationPoint[] = []

  for (let hour = 0; hour < 24; hour += 1) {
    let sum = 0
    let samples = 0

    for (const day of days) {
      const at = new Date(day)
      at.setUTCHours(hour, 0, 0, 0)
      const counts = countByStatus(stations, at)
      if (counts.total > 0) {
        sum += (counts.charging / counts.total) * 100
        samples += 1
      }
    }

    points.push({ hour, utilizationPercent: samples === 0 ? 0 : round(sum / samples, 1) })
  }

  return points
}

export function computeAnalytics(
  stations: Station[],
  sessions: ChargingSession[],
  periodDays: number,
  now: Date = new Date()
): AnalyticsData {
  const days = lastNDays(periodDays, now)

  return {
    energyByDay: computeEnergyByDay(sessions, days),
    statusDistribution: computeStatusDistribution(stations, now),
    utilizationByHour: computeUtilizationByHour(stations, days)
  }
}
