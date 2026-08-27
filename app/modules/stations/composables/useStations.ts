import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'
import { useStationsStore } from '~/modules/stations/stores/stations.store'
import type { StationSortKey } from '~/modules/stations/types'

/** Shape of Vuetify's `v-data-table-server` `@update:options` event. */
export interface StationsTableUpdate {
  page: number
  itemsPerPage: number
  sortBy: { key: string; order: 'asc' | 'desc' }[]
}

/**
 * Public entry point for the station list: no page/component calls
 * `stationRepository`, `useStationsStore` or `useStationsFiltersStore`
 * directly for this. `useAsyncData` re-fetches on its own when the filters
 * or the table state change (SSR-friendly: the initial fetch starts
 * server-side, not after hydration) — a single place knows there is HTTP
 * underneath.
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
   * `v-data-table-server` supports multi-sort, but here we keep only the
   * first column: OCM has no notion of a secondary sort, and complicating
   * the UI for a case the data does not justify is not worth it.
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
