import { analyticsRepository } from '~/modules/analytics/repository'
import { useStationsFiltersStore } from '~/modules/stations'

export type AnalyticsPeriodDays = 7 | 30 | 90

/**
 * Riusa l'area di ricerca già attiva per le stazioni come pool (stessa
 * logica di `useKpis`/`useSessions`). `period` è reattivo: cambiare il
 * selettore 7/30/90 giorni rifetcha da solo.
 */
export function useAnalytics(period: MaybeRefOrGetter<AnalyticsPeriodDays>) {
  const stationsFiltersStore = useStationsFiltersStore()

  const pool = computed(() => ({
    latitude: stationsFiltersStore.filters.latitude,
    longitude: stationsFiltersStore.filters.longitude,
    radiusKm: stationsFiltersStore.filters.radiusKm,
    countryCode: stationsFiltersStore.filters.countryCode,
    maxResults: stationsFiltersStore.filters.maxResults
  }))

  const { data, pending, error, refresh } = useAsyncData(
    'analytics-charts',
    () => analyticsRepository.charts(pool.value, toValue(period)),
    { watch: [pool, () => toValue(period)] }
  )

  return { analytics: data, pending, error, refresh }
}
