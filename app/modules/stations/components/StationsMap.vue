<script setup lang="ts">
import type { Component } from 'vue'

/**
 * Lightweight wrapper, also rendered in SSR — not a simplified
 * `StationMiniMap.vue`: there's no "show map" click placeholder here,
 * because the parent (`app/pages/stations/index.vue`) already decides
 * whether to mount this component at all (`v-if` on `viewMode`). This
 * file's only job is to keep the heavy module (`StationsMapCanvas.vue`,
 * maplibre-gl included) from ever being touched by SSR rendering — see
 * the comment inside `StationsMapCanvas.vue` for the full mechanism
 * (same one behind `StationMiniMap.vue`/`StationMiniMapCanvas.vue`).
 *
 * `defineAsyncComponent` without a `loadingComponent` (first attempt),
 * not the manual handling below: without an explicit `loadingComponent`,
 * Vue renders nothing while the dynamic import is in flight — an empty
 * gap (zero height) between `<ClientOnly>`'s fallback (which disappears
 * as soon as its own `mounted` flips true) and the real map, measured
 * with a real `PerformanceObserver` in Playwright: CLS 0.008 -> 0.465 on
 * the default split view, a double layout jump (skeleton -> collapse to
 * 0 -> map) that didn't exist before. Below, the same skeleton stays on
 * screen for the whole duration of the chunk load, not just during
 * `<ClientOnly>`'s own fallback — a single clean swap, never an empty gap.
 */
const canvasComponent = shallowRef<Component | null>(null)

onMounted(async () => {
  const module = await import('~/modules/stations/components/StationsMapCanvas.vue')
  canvasComponent.value = module.default
})
</script>

<template>
  <ClientOnly>
    <component :is="canvasComponent" v-if="canvasComponent" />
    <v-skeleton-loader v-else type="image" height="400" />
    <template #fallback>
      <v-skeleton-loader type="image" height="400" />
    </template>
  </ClientOnly>
</template>
