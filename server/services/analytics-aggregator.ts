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
 * Dati per i 3 grafici del Giorno 14, composti da dati già esistenti
 * (sessioni sintetiche, Giorno 12; telemetria simulata, Giorno 10) — nessun
 * nuovo simulatore, stesso principio del KPI aggregator (Giorno 13).
 */

/**
 * kWh/giorno per gli ultimi `periodDays`. Il nostro storico sintetico di
 * sessioni esiste solo per gli ultimi 30 giorni (`generateSessions`, default
 * `lookbackDays: 30`, Giorno 12): selezionare 90 giorni mostra
 * correttamente zero prima di quella finestra, non lo inventiamo.
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
 * Distribuzione attuale degli stati dei connettori: sempre "adesso", non
 * dipende dal periodo selezionato — è uno scatto puntuale, non un aggregato
 * su una finestra di tempo (a differenza degli altri due grafici).
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
 * Utilizzo medio per ora del giorno (0-23), mediato sui giorni del periodo
 * selezionato: per ogni ora, campiona la telemetria a quell'ora in ciascun
 * giorno e fa la media — una "giornata tipo", più stabile con periodi più
 * lunghi (90 giorni smussa più rumore di 7).
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
