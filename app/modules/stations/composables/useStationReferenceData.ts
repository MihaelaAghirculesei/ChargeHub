import { stationRepository } from '~/modules/stations/repository'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

/**
 * Lookup tables (connector types, operators, statuses) to feed the filter
 * bar dropdowns — never hardcoded lists. Cached by Nitro for 24h (see
 * `fetchReferenceData` in `server/services/ocm-client.ts`); here the
 * `useAsyncData` key follows the current `countryCode` for correctness,
 * even though there is no UI to change it yet.
 */
export function useStationReferenceData() {
  const filtersStore = useStationsFiltersStore()

  const { data, pending, error, refresh } = useAsyncData(
    () => `stations-reference-data-${filtersStore.filters.countryCode}`,
    () => stationRepository.referenceData(filtersStore.filters.countryCode),
    { watch: [() => filtersStore.filters.countryCode] }
  )

  return { data, pending, error, refresh }
}
