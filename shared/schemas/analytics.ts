import type { ChargePointStatus } from '#shared/schemas/telemetry'

/**
 * Data for the dashboard charts (day 14), non-OCM data: composed from
 * synthetic sessions (day 12) and simulated telemetry (day 10), not a new
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
