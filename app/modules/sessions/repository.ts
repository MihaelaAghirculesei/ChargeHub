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
 * Unico punto del codice client che sa che le sessioni vivono dietro
 * `/api/sessions` — stesso ruolo di `stationRepository` per le stazioni
 * (Giorno 4).
 */
export const sessionRepository = {
  list(pool: SessionsPool): Promise<ChargingSession[]> {
    return $fetch<ChargingSession[]>('/api/sessions', { query: toQuery(pool) })
  }
}
