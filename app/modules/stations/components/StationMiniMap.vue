<script setup lang="ts">
/**
 * A lightweight wrapper, rendered in SSR too (day 9) — not a simplified
 * `StationsMap.vue`: no clustering, no hover sync with a table, no viewport
 * writing to the search filters. Those are concepts that make no sense
 * here; mixing them in would have made `StationsMap` more complicated for a
 * use case that is not its own.
 *
 * The real map lives in `StationMiniMapCanvas.vue`, loaded with
 * `defineAsyncComponent` only on the click on "Show map" (day 24) — not a
 * direct `import('maplibre-gl')` in here, not even behind
 * `IntersectionObserver`/`requestIdleCallback` (earlier attempts the same
 * day, measured with Lighthouse locally on the same build as CI:
 * Performance 47 -> 52, not enough). The real reason those attempts fell
 * short, verified by reading the actual SSR HTML: an `import()` present in
 * the code of a component rendered in SSR — even if the function containing
 * it is never called server-side — still ends up in the
 * `<link rel="prefetch">` tags Nuxt generates for every dynamic import
 * reachable from a module touched by the SSR render (`vue-bundle-renderer`,
 * not a bug: prefetch is meant for dynamic imports that WILL almost always
 * run later, not for one behind an explicit click). Result: ~960 kB of
 * maplibre-gl downloaded anyway, click or not. By moving the import into a
 * file NEVER touched by SSR (mounted client-side only by
 * `defineAsyncComponent` after the click), that file does not appear among
 * the analysed SSR modules and its dynamic import is no longer prefetched
 * — verified again on the actual SSR HTML after this change.
 */
const props = defineProps<{ latitude: number; longitude: number }>()

const { t } = useI18n()
const mapLoaded = ref(false)

// No `loadingComponent` (day 24): this component's chunk is a few kB, it
// resolves practically instantly — the empty container still stays during
// the real fetch of maplibre-gl inside `initMap()`, as it did before this
// change.
const MapCanvas = defineAsyncComponent(
  () => import('~/modules/stations/components/StationMiniMapCanvas.vue')
)

function showMap() {
  mapLoaded.value = true
}
</script>

<template>
  <div v-if="!mapLoaded" class="station-mini-map station-mini-map--placeholder">
    <v-icon icon="mdi-map" size="40" class="mb-2 text-medium-emphasis" />
    <v-btn variant="tonal" color="primary" @click="showMap">
      {{ t('stations.detail.showMap') }}
    </v-btn>
  </div>
  <MapCanvas v-else :latitude="props.latitude" :longitude="props.longitude" />
</template>

<style scoped>
.station-mini-map {
  height: 220px;
  border-radius: 10px;
  overflow: hidden;
}

.station-mini-map--placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(var(--v-theme-on-surface), 0.06);
}
</style>
