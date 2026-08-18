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
  search?: string
  connectionTypeId?: number
  operatorId?: number
  statusTypeId?: number
  minPowerKw?: number
}

/**
 * Le chiavi di `StationFilters` che la barra filtri del Giorno 6 espone e
 * che finiscono nell'URL (query param condivisibile). `latitude`/`longitude`/
 * `radiusKm`/`countryCode`/`maxResults` restano fuori: sono criteri di
 * ricerca geografica/interni senza ancora una UI per cambiarli (arriva con
 * la mappa, Giorno 7) — vedi `app/modules/stations/filters-url.ts`.
 */
export type StationFilterKey =
  'search' | 'connectionTypeId' | 'operatorId' | 'statusTypeId' | 'minPowerKw'

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
