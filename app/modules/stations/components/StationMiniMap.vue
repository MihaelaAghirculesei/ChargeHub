<script setup lang="ts">
/**
 * Wrapper leggero, reso anche in SSR (Giorno 9) — non `StationsMap.vue`
 * semplificata: niente clustering, niente sync hover con una tabella,
 * niente viewport che scrive sui filtri di ricerca. Sono concetti che qui
 * non hanno senso, mescolarli avrebbe reso `StationsMap` più complicata
 * per un caso d'uso che non le appartiene.
 *
 * La mappa vera vive in `StationMiniMapCanvas.vue`, caricato con
 * `defineAsyncComponent` solo al click su "Mostra mappa" (Giorno 24) — non
 * un `import('maplibre-gl')` diretto qui dentro, neanche dietro
 * `IntersectionObserver`/`requestIdleCallback` (tentativi precedenti nello
 * stesso giorno, misurati con Lighthouse in locale sulla stessa build
 * della CI: Performance 47 -> 52, insufficiente). Il vero motivo per cui
 * quei tentativi non bastavano, verificato leggendo l'HTML SSR reale: un
 * `import()` presente nel codice di un componente reso in SSR — anche se
 * la funzione che lo contiene non viene mai chiamata lato server — finisce
 * comunque nei `<link rel="prefetch">` che Nuxt genera per ogni import
 * dinamico raggiungibile da un modulo toccato dal render SSR
 * (`vue-bundle-renderer`, non un bug: prefetch pensato per gli import
 * dinamici che POI verranno eseguiti quasi sempre, non per uno dietro un
 * click esplicito). Risultato: ~960 kB di maplibre-gl scaricati comunque,
 * click o no. Spostando l'import in un file MAI toccato da SSR (montato
 * solo client-side da `defineAsyncComponent` dopo il click), quel file non
 * compare tra i moduli SSR analizzati e il suo import dinamico non viene
 * più prefetchato — verificato di nuovo sull'HTML SSR reale dopo questo
 * cambio.
 */
const props = defineProps<{ latitude: number; longitude: number }>()

const { t } = useI18n()
const mapLoaded = ref(false)

// Nessun `loadingComponent` (Giorno 24): il chunk di questo componente è
// pochi kB, si risolve in pratica subito — resta comunque il contenitore
// vuoto durante il vero fetch di maplibre-gl dentro `initMap()`, come già
// prima di questo cambio.
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
