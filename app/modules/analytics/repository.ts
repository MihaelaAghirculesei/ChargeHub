import type { KpiSeries } from '#shared/schemas/kpi'

interface KpiPool {
  latitude: number
  longitude: number
  radiusKm: number
  countryCode: string
  maxResults: number
}

function toQuery(pool: KpiPool) {
  return {
    lat: pool.latitude,
    lon: pool.longitude,
    radius: pool.radiusKm,
    countrycode: pool.countryCode,
    maxresults: pool.maxResults
  }
}

/**
 * Unico punto del codice client che sa che i KPI vivono dietro `/api/kpi` —
 * stesso ruolo di `stationRepository`/`sessionRepository`.
 */
export const kpiRepository = {
  list(pool: KpiPool): Promise<KpiSeries[]> {
    return $fetch<KpiSeries[]>('/api/kpi', { query: toQuery(pool) })
  }
}
