<script setup lang="ts">
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { loadMaplibreGl } from '~/modules/stations/maplibre'

/**
 * Logica MapLibre vera, isolata dal wrapper `StationMiniMap.vue` (Giorno
 * 24): questo file non viene MAI toccato dal render SSR (montato solo
 * client-side via `defineAsyncComponent`, dopo il click su "Mostra
 * mappa"), quindi il suo `import('maplibre-gl')` non finisce nei
 * `<link rel="prefetch">` che Nuxt genera per ogni import dinamico
 * raggiungibile da un componente reso in SSR — vedi il commento su
 * `StationMiniMap.vue` per la spiegazione completa del meccanismo.
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

// Componente sempre montato client-side (mai da `defineAsyncComponent`
// durante SSR): `onMounted` basterebbe già qui, ma `watch` sul ref resta
// coerente con `StationsMap.vue`, che ha lo stesso vincolo dentro
// `<ClientOnly>`.
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
