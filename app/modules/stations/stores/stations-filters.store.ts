import { filtersToQuery, parseFiltersFromQuery } from '~/modules/stations/filters-url'
import type {
  StationFilters,
  StationsTableOptions,
  StationsViewMode
} from '~/modules/stations/types'

const FILTERS_COOKIE_NAME = 'chargehub-station-filters'
const VIEW_MODE_COOKIE_NAME = 'chargehub-station-view-mode'

/**
 * Wolfsburg as the default: no geolocation is built yet at first load, so a
 * sensible search centre is needed rather than coordinates 0,0 — from here
 * on (day 8) the map itself updates `latitude`/`longitude`/`radiusKm` when
 * the user pans it. `maxResults: 100` (OCM's cap) because it is "how many
 * results to keep cached to paginate over", not "how many to show" — see
 * `itemsPerPage` in `StationsTableOptions`.
 */
function defaultFilters(): StationFilters {
  return {
    latitude: 52.42,
    longitude: 10.79,
    radiusKm: 25,
    countryCode: 'DE',
    maxResults: 100
  }
}

function defaultTableOptions(): StationsTableOptions {
  return { page: 1, itemsPerPage: 10 }
}

function useFiltersCookie() {
  return useCookie<StationFilters>(FILTERS_COOKIE_NAME, {
    default: defaultFilters,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
}

/**
 * `parseFiltersFromQuery` always returns every key (`undefined` for the
 * ones absent from the URL) — useful for tests, but here we only want the
 * fields *present* in the URL: a direct spread would overwrite valid cookie
 * values (e.g. `radiusKm`) with `undefined` every time the URL does not
 * contain them, which is almost always.
 */
function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>
}

/** A cookie separate from the filters on purpose: it is a UI preference, not a search criterion. */
function useViewModeCookie() {
  return useCookie<StationsViewMode>(VIEW_MODE_COOKIE_NAME, {
    default: () => 'split',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
}

/**
 * *UI* state: search filters, table state (page/sort), map/list view mode,
 * selected station and hovered station. We persist filters and view mode
 * (via cookie, readable in SSR too) — not the current page/sort (resetting
 * the table view every session is the right behaviour, not a defect) and
 * never the station list, which is domain and must always be re-fetched
 * (see `useStationsStore`).
 *
 * The shareable filters (day-6 filter bar + day-8 map search area:
 * `latitude`/`longitude`/`radiusKm`/`search`/...) also sync with the URL
 * query params, so a search is shareable via link — those take priority
 * over the cookie on first load (a shared link must rebuild the view for
 * whoever opens it, not the one saved in their browser). The sync is
 * one-way (our changes write to URL+cookie): there is no watcher reading
 * the URL after mount, to avoid a reactive URL→filters→URL ping-pong. That
 * means browser back/forward does not navigate the filter history within
 * the page — only a refresh or a fresh load re-reads it, which is exactly
 * the plan's "Done when" criterion (copy the URL, open it elsewhere, same
 * view).
 */
export const useStationsFiltersStore = defineStore('stations-filters', () => {
  const route = useRoute()
  const router = useRouter()
  const filtersCookie = useFiltersCookie()
  const viewModeCookie = useViewModeCookie()

  const filters = ref<StationFilters>({
    ...filtersCookie.value,
    ...withoutUndefined(parseFiltersFromQuery(route.query))
  })
  const tableOptions = ref<StationsTableOptions>(defaultTableOptions())
  const viewMode = ref<StationsViewMode>(viewModeCookie.value)
  const selectedStationId = ref<number | null>(null)
  /** Station under the pointer (table row or map marker) — a transient highlight, not a selection. */
  const hoveredStationId = ref<number | null>(null)

  watch(
    filters,
    (value) => {
      filtersCookie.value = value
      router.replace({ query: { ...route.query, ...filtersToQuery(value) } })
    },
    { deep: true }
  )

  watch(viewMode, (value) => {
    viewModeCookie.value = value
  })

  function setFilters(patch: Partial<StationFilters>) {
    filters.value = { ...filters.value, ...patch }
    // Different filters = different results: staying on the previous page
    // may no longer make sense (e.g. page 5 of a list that is now 2 pages).
    tableOptions.value = { ...tableOptions.value, page: 1 }
  }

  function resetFilters() {
    filters.value = defaultFilters()
    tableOptions.value = defaultTableOptions()
  }

  function setTableOptions(patch: Partial<StationsTableOptions>) {
    tableOptions.value = { ...tableOptions.value, ...patch }
  }

  function setViewMode(mode: StationsViewMode) {
    viewMode.value = mode
  }

  function select(id: number | null) {
    selectedStationId.value = id
  }

  function hover(id: number | null) {
    hoveredStationId.value = id
  }

  return {
    filters,
    tableOptions,
    viewMode,
    selectedStationId,
    hoveredStationId,
    setFilters,
    resetFilters,
    setTableOptions,
    setViewMode,
    select,
    hover
  }
})
