/**
 * Unico punto di export pubblico del modulo stazioni. `stationRepository`
 * resta volutamente privato: solo `useStationsStore` lo chiama, così un
 * componente non può bypassare lo store e parlare di HTTP per conto suo.
 */
export { useStations } from '~/modules/stations/composables/useStations'
export { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'
export { useStationsStore } from '~/modules/stations/stores/stations.store'
export type { StationFilters } from '~/modules/stations/types'
