/**
 * Shared MapLibre GL loader for `StationsMapCanvas.vue` and
 * `StationMiniMapCanvas.vue` (both dynamically import it, client-only, to
 * keep it out of the SSR-reachable import graph — see either component's
 * own comment for why).
 *
 * Centralizes the worker-URL fix. MapLibre GL builds its worker's URL from
 * a template literal relative to `import.meta.url` of its own chunk, which
 * Vite/Rollup's static analysis can't see — so the worker never gets
 * emitted and the map falls back to a 404 (tiles still render, but the
 * GeoJSON/cluster layer, which is parsed in the worker, silently does
 * not).
 *
 * `?url` alone (the earlier fix) copied `maplibre-gl-worker.mjs` verbatim
 * — but MapLibre 6 split a `./maplibre-gl-shared.mjs` chunk out of it, and
 * a verbatim copy still imports that sibling by name, which then 404s in
 * production. `?worker&url` makes Vite *bundle* the worker (following
 * `./maplibre-gl-shared.mjs` and inlining it) and hand back the URL of the
 * self-contained result, which is what `setWorkerUrl` needs.
 */
export async function loadMaplibreGl() {
  const [maplibregl, { default: workerUrl }] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')
  ])
  maplibregl.setWorkerUrl(workerUrl)
  return maplibregl
}
