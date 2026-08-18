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
 * Le chiavi di `StationFilters` che finiscono nell'URL (query param
 * condivisibile). `latitude`/`longitude`/`radiusKm` sono qui dal Giorno 8:
 * spostare la mappa è ora un modo di cambiare la ricerca, non solo la barra
 * filtri del Giorno 6 — vedi `app/modules/stations/filters-url.ts`.
 * `countryCode`/`maxResults` restano fuori: il primo non ha ancora una UI,
 * il secondo è un dettaglio interno (quanti risultati cachare), non un
 * criterio di ricerca che un utente percepisce.
 */
export type StationFilterKey =
  | 'latitude'
  | 'longitude'
  | 'radiusKm'
  | 'search'
  | 'connectionTypeId'
  | 'operatorId'
  | 'statusTypeId'
  | 'minPowerKw'

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

/**
 * Come mostrare mappa e lista sul Giorno 8: una delle due, o entrambe
 * affiancate. Stato di UI puro, persistito ("con la scelta ricordata") ma
 * separato dai filtri di ricerca — cambiare vista non cambia i risultati.
 */
export type StationsViewMode = 'map' | 'list' | 'split'

export type { StationSortKey }
