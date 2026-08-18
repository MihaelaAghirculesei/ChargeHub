import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'
import { useStationsStore } from '~/modules/stations/stores/stations.store'
import type { StationSortKey } from '~/modules/stations/types'

/** Forma dell'evento `@update:options` di `v-data-table-server` di Vuetify. */
export interface StationsTableUpdate {
  page: number
  itemsPerPage: number
  sortBy: { key: string; order: 'asc' | 'desc' }[]
}

/**
 * Punto di ingresso pubblico per la lista stazioni: nessuna pagina/componente
 * chiama `stationRepository`, `useStationsStore` o `useStationsFiltersStore`
 * direttamente per questo. `useAsyncData` rifetcha da solo quando filtri o
 * stato della tabella cambiano (SSR-friendly: il fetch iniziale parte lato
 * server, non dopo l'hydration) — un solo posto sa che sotto c'è HTTP.
 */
export function useStations() {
  const stationsStore = useStationsStore()
  const filtersStore = useStationsFiltersStore()

  const { data, pending, error, refresh } = useAsyncData(
    'stations-list',
    () => stationsStore.list(filtersStore.filters, filtersStore.tableOptions),
    { watch: [filtersStore.filters, filtersStore.tableOptions] }
  )

  const stations = computed(() => data.value?.items ?? [])
  const total = computed(() => data.value?.total ?? 0)

  /**
   * `v-data-table-server` supporta il multi-sort, ma qui ne teniamo solo la
   * prima colonna: OCM non ha una nozione di ordinamento secondario e
   * complicare la UI per un caso che i dati non giustificano non vale la pena.
   */
  function updateOptions(options: StationsTableUpdate) {
    const [primarySort] = options.sortBy
    filtersStore.setTableOptions({
      page: options.page,
      itemsPerPage: options.itemsPerPage,
      sortBy: primarySort?.key as StationSortKey | undefined,
      sortOrder: primarySort?.order
    })
  }

  return { data, stations, total, pending, error, refresh, updateOptions }
}
