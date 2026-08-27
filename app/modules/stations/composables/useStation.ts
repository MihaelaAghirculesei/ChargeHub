import { useStationsStore } from '~/modules/stations/stores/stations.store'

/**
 * Public entry point for the single station (detail page, day 9): no
 * page/component calls `stationRepository` or `useStationsStore` directly
 * for this.
 *
 * `async` + `await useAsyncData(...)` internally, not just
 * `useAsyncData(...)` destructured right away: the page must be able to
 * `await useStation(id)` and check `station.value` *synchronously right
 * after* to decide whether to throw a 404 — if this function returned a
 * plain object (not a real Promise), that `await` in the page would wait
 * for nothing, and the check would always see `station.value` still
 * `undefined` (a real bug, found by verifying live: the page returned 404
 * even for existing stations).
 */
export async function useStation(id: MaybeRefOrGetter<number>) {
  const stationsStore = useStationsStore()

  const { data, pending, error, refresh } = await useAsyncData(
    () => `station-${toValue(id)}`,
    () => stationsStore.getById(toValue(id)),
    { watch: [() => toValue(id)] }
  )

  return { station: data, pending, error, refresh }
}
