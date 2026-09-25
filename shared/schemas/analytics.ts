import type { ChargePointStatus } from '#shared/schemas/telemetry'

/**
 * Data for the dashboard charts, non-OCM data: composed from
 * synthetic sessions and simulated telemetry, not a new
 * simulator. See server/services/analytics-aggregator.ts.
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
