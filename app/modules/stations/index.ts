/**
 * The single public export point of the stations module. `stationRepository`
 * stays deliberately private: only `useStationsStore` calls it, so a
 * component cannot bypass the store and talk HTTP on its own.
 */
export { useNlSearch } from '~/modules/stations/composables/useNlSearch'
export { useStation } from '~/modules/stations/composables/useStation'
export { useStationReferenceData } from '~/modules/stations/composables/useStationReferenceData'
export { useStations } from '~/modules/stations/composables/useStations'
export type { StationsTableUpdate } from '~/modules/stations/composables/useStations'
export { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'
export { useStationsStore } from '~/modules/stations/stores/stations.store'
export type {
  StationFilterKey,
  StationFilters,
  StationsTableOptions,
  StationsViewMode
} from '~/modules/stations/types'
