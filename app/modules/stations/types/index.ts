/**
 * Filtri di ricerca stazioni lato client. Forma di dominio, non di rete:
 * `stationRepository` è l'unico punto che li traduce nei query param che
 * `GET /api/stations` si aspetta (vedi server/api/stations/index.get.ts).
 */
export interface StationFilters {
  latitude: number
  longitude: number
  radiusKm: number
  countryCode: string
  maxResults: number
  connectionTypeId?: number
  operatorId?: number
  statusTypeId?: number
  minPowerKw?: number
}
