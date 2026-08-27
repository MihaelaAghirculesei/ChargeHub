<script setup lang="ts">
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { loadMaplibreGl } from '~/modules/stations/maplibre'

/**
 * The real MapLibre logic, isolated from the `StationMiniMap.vue` wrapper
 * (day 24): this file is NEVER touched by the SSR render (mounted
 * client-side only via `defineAsyncComponent`, after the click on "Show
 * map"), so its `import('maplibre-gl')` does not end up in the
 * `<link rel="prefetch">` tags Nuxt generates for every dynamic import
 * reachable from an SSR-rendered component — see the comment on
 * `StationMiniMap.vue` for the full explanation of the mechanism.
 */
const props = defineProps<{ latitude: number; longitude: number }>()

const { t } = useI18n()
const mapContainer = ref<HTMLDivElement | null>(null)
const theme = useTheme()
let map: MapLibreMap | null = null
let marker: Marker | null = null

async function initMap() {
  if (!mapContainer.value) return
  const [maplibregl] = await Promise.all([
    loadMaplibreGl(),
    import('maplibre-gl/dist/maplibre-gl.css')
  ])

  const mapInstance = new maplibregl.Map({
    container: mapContainer.value,
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          maxzoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        }
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
    },
    center: [props.longitude, props.latitude],
    zoom: 15
  })
  map = mapInstance

  mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

  marker = new maplibregl.Marker({ color: theme.current.value.colors.primary })
    .setLngLat([props.longitude, props.latitude])
    .addTo(mapInstance)
}

// Component always mounted client-side (never from `defineAsyncComponent`
// during SSR): `onMounted` would already be enough here, but a `watch` on
// the ref stays consistent with `StationsMap.vue`, which has the same
// constraint inside `<ClientOnly>`.
watch(mapContainer, (el) => {
  if (el) initMap()
})

onBeforeUnmount(() => {
  marker?.remove()
  map?.remove()
  map = null
})
</script>

<template>
  <!--
    `role="application"`, non "img": la mappa contiene controlli
    interattivi focalizzabili veri (zoom, attribuzione) via
    `NavigationControl` — "img" nega semanticamente contenuto interattivo
    al suo interno (`nested-interactive`, trovato con axe-core solo quando
    la mappa si inizializza davvero).
  -->
  <div
    ref="mapContainer"
    class="station-mini-map"
    role="application"
    :aria-label="t('stations.miniMapAriaLabel')"
  />
</template>

<style scoped>
.station-mini-map {
  height: 220px;
  border-radius: 10px;
  overflow: hidden;
}
</style>
