/**
 * Shared MapLibre GL loader for `StationsMapCanvas.vue` and
 * `StationMiniMapCanvas.vue` (both dynamically import it, client-only, to
 * keep it out of the SSR-reachable import graph — see either component's
 * own comment for why).
 *
 * Centralizes the worker-URL fix (25/08, docs/PROGRESS.md): MapLibre GL's
 * own runtime code builds its worker's URL from a template literal
 * relative to `import.meta.url` of its own chunk (`` `./${name}` ``),
 * which Vite/Rollup's static analysis can't see — so the worker file
 * never gets emitted as a build asset, and the app silently falls back to
 * an `AJAXError`/404 in the console (tiles still render, just without a
 * dedicated parsing worker). `?url` explicitly imports the real worker
 * file as a content-hashed asset Vite CAN see, and `setWorkerUrl` points
 * MapLibre at it.
 */
export async function loadMaplibreGl() {
  const [maplibregl, { default: workerUrl }] = await Promise.all([
    import('maplibre-gl'),
    import('maplibre-gl/dist/maplibre-gl-worker.mjs?url')
  ])
  maplibregl.setWorkerUrl(workerUrl)
  return maplibregl
}
