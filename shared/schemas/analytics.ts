import type { ChargePointStatus } from '#shared/schemas/telemetry'

/**
 * Dati per i grafici della dashboard (Giorno 14), dato non-OCM: composti da
 * sessioni sintetiche (Giorno 12) e telemetria simulata (Giorno 10), non un
 * nuovo simulatore. Vedi server/services/analytics-aggregator.ts.
 */
export interface DailyEnergyPoint {
  /** YYYY-MM-DD. */
  date: string
  energyKwh: number
}

export interface StatusDistributionPoint {
  status: ChargePointStatus
  count: number
}

export interface HourlyUtilizationPoint {
  /** 0-23. */
  hour: number
  utilizationPercent: number
}

export interface AnalyticsData {
  energyByDay: DailyEnergyPoint[]
  statusDistribution: StatusDistributionPoint[]
  utilizationByHour: HourlyUtilizationPoint[]
}
