import { FetchError } from 'ofetch'
import { stationRepository } from '~/modules/stations/repository'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'
import type { StationFilters } from '~/modules/stations/types'

/**
 * Natural-language station search (ADR-0007): does not return stations, it
 * returns filters. The extracted criteria are **merged** into the filters
 * already active in the classic bar — only the fields the query actually
 * names are updated, the ones it does not mention (and the map position)
 * stay intact. So "Ionity stations" does not clear a hand-set "min 50 kW":
 * NL search adds criteria on top of the current view, it does not redefine
 * it (see ADR). `pending`/`error` are separate from `useStations()`: an
 * error here (Claude unreachable, rate limit) must not empty the station
 * list already shown — the user can always fall back to the normal filter
 * bar.
 */
export type NlSearchErrorCode = 'rate_limited' | 'daily_cap' | 'not_configured' | 'failed'

export function useNlSearch() {
  const filtersStore = useStationsFiltersStore()
  const pending = ref(false)
  // A code, not an already-translated message: the component picks the text
  // (i18n) — same rule already used for the server-generated KPIs.
  const error = ref<NlSearchErrorCode | null>(null)

  // `string | null`, not just `string`: the field is `clearable` (Vuetify
  // sets the v-model to `null` on the clear button, not to an empty string)
  // — defence in depth on the composable's public API, not only in the
  // component that calls it today.
  async function search(query: string | null) {
    const trimmed = (query ?? '').trim()
    if (!trimmed) return
    // A second Enter/click while the first search is still in flight would
    // send a second identical POST (2 Claude calls, 2 rate-limiter
    // increments) — exactly what the ADR-0007 cost ceiling is there to
    // avoid. The template already has one path for Enter and one for the
    // click; this guard is the defence in depth on the public API.
    if (pending.value) return

    pending.value = true
    error.value = null
    try {
      const { filters } = await stationRepository.nlSearch(
        trimmed,
        filtersStore.filters.countryCode
      )
      // Merge, not replace: write only the fields the query actually
      // extracted. A `null` means "not mentioned" — the current filter value
      // stays, it is not overwritten with `undefined`.
      const patch: Partial<StationFilters> = {}
      if (filters.search !== null) patch.search = filters.search
      if (filters.connectionTypeId !== null) patch.connectionTypeId = filters.connectionTypeId
      if (filters.operatorId !== null) patch.operatorId = filters.operatorId
      if (filters.statusTypeId !== null) patch.statusTypeId = filters.statusTypeId
      if (filters.minPowerKw !== null) patch.minPowerKw = filters.minPowerKw
      filtersStore.setFilters(patch)
    } catch (caught) {
      if (caught instanceof FetchError && caught.statusCode === 429) {
        // Two different 429s, not the same event for the user: the global
        // daily cap (data.code, see nl-search.post.ts) does not clear
        // "shortly" like the per-IP rate limit — point at the classic
        // filters, not at a retry soon.
        // `caught.data` is the whole H3 error body (statusCode/message/
        // data/...), not just its `data` field — one nesting level deeper
        // than the name suggests.
        error.value = caught.data?.data?.code === 'daily_cap' ? 'daily_cap' : 'rate_limited'
      } else if (caught instanceof FetchError && caught.statusCode === 503) {
        error.value = 'not_configured'
      } else {
        error.value = 'failed'
      }
    } finally {
      pending.value = false
    }
  }

  return { search, pending, error }
}
