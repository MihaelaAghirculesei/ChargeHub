import { analyticsRepository } from '~/modules/analytics/repository'
import { useStationsFiltersStore } from '~/modules/stations'

/**
 * Reuses the search area already active for stations (day 4) as the pool
 * for the KPIs — the same logic as `useSessions` (day 12). Unlike the
 * sessions, the payload is small (6 KPIs × 7 series points): SSR by
 * default, consistent with the idea of a dashboard that shows real content
 * in the first response right away.
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
    () => analyticsRepository.kpis(pool.value),
    { watch: [pool] }
  )

  const kpis = computed(() => data.value ?? [])

  return { kpis, pending, error, refresh }
}
