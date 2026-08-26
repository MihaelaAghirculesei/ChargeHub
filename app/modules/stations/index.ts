/**
 * Unico punto di export pubblico del modulo stazioni. `stationRepository`
 * resta volutamente privato: solo `useStationsStore` lo chiama, così un
 * componente non può bypassare lo store e parlare di HTTP per conto suo.
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
