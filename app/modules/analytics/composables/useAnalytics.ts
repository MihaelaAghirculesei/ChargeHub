import { analyticsRepository } from '~/modules/analytics/repository'
import { useStationsFiltersStore } from '~/modules/stations'

export type AnalyticsPeriodDays = 7 | 30 | 90

/**
 * Reuses the search area already active for stations as the pool (the same
 * logic as `useKpis`/`useSessions`). `period` is reactive: changing the
 * 7/30/90-day selector re-fetches on its own.
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
