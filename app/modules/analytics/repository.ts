import type { AnalyticsData } from '#shared/schemas/analytics'
import type { KpiSeries } from '#shared/schemas/kpi'

interface AnalyticsPool {
  latitude: number
  longitude: number
  radiusKm: number
  countryCode: string
  maxResults: number
}

function toQuery(pool: AnalyticsPool) {
  return {
    lat: pool.latitude,
    lon: pool.longitude,
    radius: pool.radiusKm,
    countrycode: pool.countryCode,
    maxresults: pool.maxResults
  }
}

/**
 * The only place in the client code that knows KPIs and charts live behind
 * `/api/kpi`/`/api/analytics` — the same role as `stationRepository`/
 * `sessionRepository`.
 */
export const analyticsRepository = {
  kpis(pool: AnalyticsPool): Promise<KpiSeries[]> {
    return $fetch<KpiSeries[]>('/api/kpi', { query: toQuery(pool) })
  },

  charts(pool: AnalyticsPool, periodDays: number): Promise<AnalyticsData> {
    return $fetch<AnalyticsData>('/api/analytics', {
      query: { ...toQuery(pool), period: periodDays }
    })
  }
}
