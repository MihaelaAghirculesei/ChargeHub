import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'
import { useStationsStore } from '~/modules/stations/stores/stations.store'

/**
 * Punto di ingresso pubblico per la lista stazioni: nessuna pagina/componente
 * chiama `stationRepository` o `useStationsStore` direttamente per questo.
 * `useAsyncData` rifetcha da solo quando i filtri cambiano (SSR-friendly:
 * il fetch iniziale parte lato server, non dopo l'hydration).
 */
export function useStations() {
  const stationsStore = useStationsStore()
  const filtersStore = useStationsFiltersStore()

  const { data, pending, error, refresh } = useAsyncData(
    'stations-list',
    () => stationsStore.list(filtersStore.filters),
    { watch: [filtersStore.filters] }
  )

  return { data, pending, error, refresh }
}
