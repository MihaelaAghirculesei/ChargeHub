import { kpiRepository } from '~/modules/analytics/repository'
import { useStationsFiltersStore } from '~/modules/stations'

/**
 * Riusa l'area di ricerca già attiva per le stazioni (Giorno 4) come pool
 * per i KPI — stessa logica di `useSessions` (Giorno 12). A differenza
 * delle sessioni, il payload è piccolo (6 KPI × 7 punti di serie): SSR di
 * default, coerente con l'idea di una dashboard che mostra subito contenuto
 * reale nella prima risposta.
 */
export function useKpis() {
  const stationsFiltersStore = useStationsFiltersStore()

  const pool = computed(() => ({
    latitude: stationsFiltersStore.filters.latitude,
    longitude: stationsFiltersStore.filters.longitude,
    radiusKm: stationsFiltersStore.filters.radiusKm,
    countryCode: stationsFiltersStore.filters.countryCode,
    maxResults: stationsFiltersStore.filters.maxResults
  }))

  const { data, pending, error, refresh } = useAsyncData(
    'dashboard-kpis',
    () => kpiRepository.list(pool.value),
    { watch: [pool] }
  )

  const kpis = computed(() => data.value ?? [])

  return { kpis, pending, error, refresh }
}
