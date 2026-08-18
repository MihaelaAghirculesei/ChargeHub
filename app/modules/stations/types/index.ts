import type { StationSortKey } from '#shared/schemas/station'

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

/**
 * Stato della tabella (`v-data-table-server`), non della ricerca: cambiare
 * pagina/ordinamento non è un nuovo filtro. Tenuto separato da
 * `StationFilters` apposta — vedi `useStationsFiltersStore`.
 */
export interface StationsTableOptions {
  page: number
  itemsPerPage: number
  sortBy?: StationSortKey
  sortOrder?: 'asc' | 'desc'
}

export type { StationSortKey }
