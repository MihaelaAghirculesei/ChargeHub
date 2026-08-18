<script setup lang="ts">
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection, Point } from 'geojson'
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  Popup
} from 'maplibre-gl'
import { haversineDistanceKm } from '~/modules/stations/geo'
import { useStations } from '~/modules/stations/composables/useStations'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

/**
 * Import statico solo dei tipi (erasi a build time) e del CSS — il pacchetto
 * JS vero e proprio si importa dinamicamente dentro `initMap()`, chiamata
 * solo da `onMounted` (mai lato server). La guardia SSR vera è
 * `<ClientOnly>` nel template, non l'import.
 */
const { stations } = useStations()
const filtersStore = useStationsFiltersStore()
const theme = useTheme()
const { t } = useI18n()
const localePath = useLocalePath()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: MapLibreMap | null = null
let popup: Popup | null = null
let hoveredFeatureId: number | undefined

const SOURCE_ID = 'stations'
const CLUSTERS_LAYER = 'stations-clusters'
const CLUSTER_COUNT_LAYER = 'stations-cluster-count'
const POINTS_LAYER = 'stations-points'
const MAX_RADIUS_KM = 100

interface StationFeatureProperties {
  id: number
  name: string
  operator: string
  operationalStatus: string
  isOperational: string
}

function colorFor(key: string): string {
  return theme.current.value.colors[key] ?? '#888888'
}

function toGeoJson(
  items: typeof stations.value
): FeatureCollection<Point, StationFeatureProperties> {
  return {
    type: 'FeatureCollection',
    features: items
      .filter((station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude))
      .map((station) => ({
        type: 'Feature',
        id: station.id,
        geometry: { type: 'Point', coordinates: [station.longitude, station.latitude] },
        properties: {
          id: station.id,
          name: station.name,
          operator: station.operator,
          operationalStatus: station.operationalStatus,
          // GeoJSON non ha `null`/`undefined` per un booleano in `properties`
          // in modo affidabile per le espressioni di stile: normalizziamo a
          // una stringa a 3 stati.
          isOperational: station.isOperational === null ? 'unknown' : String(station.isOperational)
        }
      }))
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function popupHtml(feature: MapGeoJSONFeature): string {
  const properties = feature.properties as StationFeatureProperties
  return `
    <div class="stations-map-popup">
      <p class="text-body-2 font-weight-medium mb-1">${escapeHtml(properties.name)}</p>
      <p class="text-caption text-medium-emphasis mb-1">${escapeHtml(properties.operator)} &middot; ${escapeHtml(properties.operationalStatus)}</p>
      <a href="${escapeHtml(localePath(`/stations/${properties.id}`))}" class="text-caption">${escapeHtml(t('stations.popupDetails'))}</a>
    </div>
  `
}

function statusColorExpression(): ExpressionSpecification {
  return [
    'match',
    ['get', 'isOperational'],
    'true',
    colorFor('success'),
    'false',
    colorFor('error'),
    colorFor('surface-variant')
  ]
}

/** Il marker in hover (dalla mappa stessa o dalla riga corrispondente in tabella) è più grande. */
function radiusExpression(): ExpressionSpecification {
  return ['case', ['boolean', ['feature-state', 'hover'], false], 11, 8]
}

/**
 * Deriva un'area di ricerca (centro + raggio) dal viewport corrente:
 * OCM non ha una ricerca per bounding box, solo per raggio, quindi il
 * raggio è la distanza dal centro all'angolo nord-est, con un tetto di
 * 100km (lo stesso limite reale di OCM/dello schema di `/api/stations`).
 */
function updateFiltersFromViewport(mapInstance: MapLibreMap) {
  const center = mapInstance.getCenter()
  const bounds = mapInstance.getBounds()
  const northEast = bounds.getNorthEast()
  const radiusKm = haversineDistanceKm(
    { latitude: center.lat, longitude: center.lng },
    { latitude: northEast.lat, longitude: northEast.lng }
  )

  filtersStore.setFilters({
    latitude: center.lat,
    longitude: center.lng,
    radiusKm: Math.min(Math.max(Math.round(radiusKm), 1), MAX_RADIUS_KM)
  })
}

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
          // Obbligatoria dalla licenza OSM (ODbL) — non solo buona pratica.
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        }
      },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
    },
    center: [filtersStore.filters.longitude, filtersStore.filters.latitude],
    zoom: 10
  })
  map = mapInstance

  mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

  // Debounced apposta ("Fatto quando: non parte una richiesta a ogni pixel
  // di spostamento"): `moveend` da solo già scatta solo a gesto concluso,
  // ma una sequenza rapida di piccoli pan/zoom produce comunque più
  // `moveend` ravvicinati — questo li raccoglie in un solo aggiornamento.
  const debouncedUpdateFromViewport = useDebounceFn(
    () => updateFiltersFromViewport(mapInstance),
    400
  )
  mapInstance.on('moveend', debouncedUpdateFromViewport)

  mapInstance.on('load', () => {
    mapInstance.addSource(SOURCE_ID, {
      type: 'geojson',
      data: toGeoJson(stations.value),
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: 14
    })

    mapInstance.addLayer({
      id: CLUSTERS_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': colorFor('primary'),
        'circle-opacity': 0.85,
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26]
      }
    })

    mapInstance.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 },
      paint: { 'text-color': colorFor('on-primary') }
    })

    mapInstance.addLayer({
      id: POINTS_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      paint: {
        // Colore per stato — stessa logica a tre vie di StationStatusChip.vue
        // (isOperational true/false/sconosciuto), non un mapping di ogni
        // possibile stringa operationalStatus.
        'circle-color': statusColorExpression(),
        'circle-radius': radiusExpression(),
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    })

    mapInstance.on('click', CLUSTERS_LAYER, async (event) => {
      const [feature] = mapInstance.queryRenderedFeatures(event.point, { layers: [CLUSTERS_LAYER] })
      if (!feature) return
      const clusterId = feature.properties?.cluster_id
      if (clusterId === undefined) return
      const source = mapInstance.getSource(SOURCE_ID) as GeoJSONSource
      const zoom = await source.getClusterExpansionZoom(clusterId)
      const geometry = feature.geometry as Point
      mapInstance.easeTo({ center: geometry.coordinates as [number, number], zoom })
    })

    mapInstance.on('click', POINTS_LAYER, (event) => {
      const feature = event.features?.[0]
      if (!feature) return
      const geometry = feature.geometry as Point
      popup?.remove()
      popup = new maplibregl.Popup({ closeButton: true, maxWidth: '240px' })
        .setLngLat(geometry.coordinates as [number, number])
        .setHTML(popupHtml(feature))
        .addTo(mapInstance)
    })

    // Hover mappa → riga tabella: `mousemove` invece di `mouseenter` perché
    // un layer non emette "mouseenter" per-feature, solo per-layer — questo
    // pattern (variabile con l'ultimo id in hover) è quello standard di
    // MapLibre per simulare hover per singola feature.
    mapInstance.on('mousemove', POINTS_LAYER, (event) => {
      mapInstance.getCanvas().style.cursor = 'pointer'
      const feature = event.features?.[0]
      const id = typeof feature?.id === 'number' ? feature.id : undefined
      if (id === hoveredFeatureId) return
      hoveredFeatureId = id
      filtersStore.hover(id ?? null)
    })
    mapInstance.on('mouseleave', POINTS_LAYER, () => {
      mapInstance.getCanvas().style.cursor = ''
      hoveredFeatureId = undefined
      filtersStore.hover(null)
    })
  })
}

watch(stations, (value) => {
  const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined
  source?.setData(toGeoJson(value))
})

// Hover tabella → marker mappa (l'altra direzione della sync richiesta dal
// Giorno 8): `feature-state` invece di ricostruire lo style, è il modo
// pensato da MapLibre per un'evidenziazione che cambia spesso.
watch(
  () => filtersStore.hoveredStationId,
  (id, previousId) => {
    if (!map) return
    if (previousId !== null) {
      map.setFeatureState({ source: SOURCE_ID, id: previousId }, { hover: false })
    }
    if (id !== null) {
      map.setFeatureState({ source: SOURCE_ID, id }, { hover: true })
    }
  }
)

// I colori delle stazioni/cluster sono presi dal tema al momento della
// creazione dei layer: al cambio light/dark vanno riapplicati a mano,
// MapLibre non li rilegge da solo.
watch(
  () => theme.current.value.dark,
  () => {
    if (!map?.isStyleLoaded()) return
    map.setPaintProperty(CLUSTERS_LAYER, 'circle-color', colorFor('primary'))
    map.setPaintProperty(CLUSTER_COUNT_LAYER, 'text-color', colorFor('on-primary'))
    map.setPaintProperty(POINTS_LAYER, 'circle-color', statusColorExpression())
  }
)

onMounted(initMap)

onBeforeUnmount(() => {
  popup?.remove()
  map?.remove()
  map = null
})
</script>

<template>
  <ClientOnly>
    <div
      ref="mapContainer"
      class="stations-map"
      role="application"
      :aria-label="t('stations.mapAriaLabel')"
    />
    <template #fallback>
      <v-skeleton-loader type="image" height="400" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.stations-map {
  height: 400px;
  border-radius: 10px;
  overflow: hidden;
}
</style>
