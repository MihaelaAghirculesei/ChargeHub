import type { StationSortKey } from '#shared/schemas/station'

/**
 * Client-side station search filters. A domain shape, not a network one:
 * `stationRepository` is the only place that translates them into the query
 * params `GET /api/stations` expects (see server/api/stations/index.get.ts).
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
 * The `StationFilters` keys that end up in the URL (shareable query param).
 * `latitude`/`longitude`/`radiusKm` are here since day 8: panning the map
 * is now a way to change the search, not only the day-6 filter bar — see
 * `app/modules/stations/filters-url.ts`. `countryCode`/`maxResults` stay
 * out: the first has no UI yet, the second is an internal detail (how many
 * results to cache), not a search criterion a user perceives.
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
 * Table state (`v-data-table-server`), not search state: changing
 * page/sort is not a new filter. Kept separate from `StationFilters` on
 * purpose — see `useStationsFiltersStore`.
 */
export interface StationsTableOptions {
  page: number
  itemsPerPage: number
  sortBy?: StationSortKey
  sortOrder?: 'asc' | 'desc'
}

/**
 * How to show the map and list from day 8: one of the two, or both side by
 * side. Pure UI state, persisted ("with the choice remembered") but
 * separate from the search filters — changing the view does not change the
 * results.
 */
export type StationsViewMode = 'map' | 'list' | 'split'

export type { StationSortKey }
