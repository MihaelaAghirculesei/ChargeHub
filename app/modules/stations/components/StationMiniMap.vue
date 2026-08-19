<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Map as MapLibreMap, Marker } from 'maplibre-gl'

/**
 * Mappa a marker singolo per la pagina di dettaglio (Giorno 9) — non è
 * `StationsMap.vue` semplificata: niente clustering, niente sync hover con
 * una tabella, niente viewport che scrive sui filtri di ricerca. Sono
 * concetti che qui non hanno senso, mescolarli avrebbe reso `StationsMap`
 * più complicata per un caso d'uso che non le appartiene.
 */
const props = defineProps<{ latitude: number; longitude: number }>()

const { t } = useI18n()
const mapContainer = ref<HTMLDivElement | null>(null)
const theme = useTheme()
let map: MapLibreMap | null = null
let marker: Marker | null = null

async function initMap() {
  if (!mapContainer.value) return
  const maplibregl = await import('maplibre-gl')

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

// Stesso bug/fix di StationsMap.vue: `<ClientOnly>` sostituisce il proprio
// `#fallback` col div reale un tick dopo l'`onMounted` di questo
// componente, quindi `onMounted(initMap)` troverebbe sempre
// `mapContainer.value` nullo. `watch` sul ref, non `onMounted`.
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
  <ClientOnly>
    <!--
      `role="application"`, non "img": la mappa contiene controlli
      interattivi focalizzabili veri (zoom, attribuzione) via
      `NavigationControl` — "img" nega semanticamente contenuto
      interattivo al suo interno (`nested-interactive`, trovato con
      axe-core solo ora che la mappa si inizializza davvero, vedi il fix
      del bug di mount qui sopra: prima non veniva mai scansionata).
    -->
    <div
      ref="mapContainer"
      class="station-mini-map"
      role="application"
      :aria-label="t('stations.miniMapAriaLabel')"
    />
    <template #fallback>
      <v-skeleton-loader type="image" height="220" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.station-mini-map {
  height: 220px;
  border-radius: 10px;
  overflow: hidden;
}
</style>
