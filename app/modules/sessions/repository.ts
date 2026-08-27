import type { ChargingSession } from '#shared/schemas/session'

interface SessionsPool {
  latitude: number
  longitude: number
  radiusKm: number
  countryCode: string
  maxResults: number
}

function toQuery(pool: SessionsPool) {
  return {
    lat: pool.latitude,
    lon: pool.longitude,
    radius: pool.radiusKm,
    countrycode: pool.countryCode,
    maxresults: pool.maxResults
  }
}

/**
 * The only place in the client code that knows sessions live behind
 * `/api/sessions` — the same role as `stationRepository` for stations
 * (day 4).
 */
export const sessionRepository = {
  list(pool: SessionsPool): Promise<ChargingSession[]> {
    return $fetch<ChargingSession[]>('/api/sessions', { query: toQuery(pool) })
  }
}
