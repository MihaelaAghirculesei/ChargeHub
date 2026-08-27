import { useStationsFiltersStore } from '~/modules/stations'
import { sessionRepository } from '~/modules/sessions/repository'

/**
 * Reuses the search area already active for stations (the same store as day
 * 4) as the pool to generate the synthetic sessions from: "the sessions of
 * the stations you are already looking at", not an independent search area.
 * Only the pool's geographic fields are watched, not the whole store —
 * changing the stations text search (which does not touch the pool) must
 * not restart the sessions fetch.
 *
 * `server: false`: the ~2000 rows measure about 600KB of JSON — no point
 * bloating the SSR HTML/payload of every load with data that only feeds the
 * client-side virtualised table, with no SEO/sharing value unlike the
 * station detail (day 9). The fetch starts after hydration, `pending`
 * drives the table's loading state.
 *
 * The `pending` exposed here is not `useAsyncData`'s raw `pending`: with
 * `server: false` the fetch never starts server-side, so the SSR HTML is
 * generated with `pending === false` — but client-side Nuxt schedules it in
 * `onBeforeMount` (to avoid blocking the first render), which fires
 * *before* Vue's hydration comparison. The result: at hydration time
 * `pending` is already `true`, while the HTML received from the server
 * still reflects `false` — a real hydration mismatch
 * (`v-data-table--loading` present/absent), found via a Vue console
 * warning, not by eye. `hydrated` (false until `onMounted` fires, i.e.
 * after hydration is already complete) keeps `pending` forced to `false`
 * for the very first render — identical to what the SSR HTML already showed
 * — and lets it reflect the real state only from there on, when a reactive
 * post-mount update is no longer a hydration comparison.
 */
export function useSessions() {
  const stationsFiltersStore = useStationsFiltersStore()

  const pool = computed(() => ({
    latitude: stationsFiltersStore.filters.latitude,
    longitude: stationsFiltersStore.filters.longitude,
    radiusKm: stationsFiltersStore.filters.radiusKm,
    countryCode: stationsFiltersStore.filters.countryCode,
    maxResults: stationsFiltersStore.filters.maxResults
  }))

  const {
    data,
    pending: rawPending,
    error,
    refresh
  } = useAsyncData('sessions-list', () => sessionRepository.list(pool.value), {
    watch: [pool],
    server: false
  })

  const hydrated = ref(false)
  onMounted(() => {
    hydrated.value = true
  })

  const sessions = computed(() => data.value ?? [])
  const pending = computed(() => hydrated.value && rawPending.value)

  return { sessions, pending, error, refresh }
}
