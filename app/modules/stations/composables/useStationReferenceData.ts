import { stationRepository } from '~/modules/stations/repository'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

/**
 * Tabelle di lookup (tipi di connettore, operatori, stati) per alimentare i
 * dropdown della barra filtri — mai liste hardcoded. Cachata da Nitro 24h
 * (vedi `fetchReferenceData` in `server/services/ocm-client.ts`); qui la
 * chiave di `useAsyncData` segue il `countryCode` corrente per correttezza,
 * anche se oggi non c'è ancora una UI per cambiarlo.
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
