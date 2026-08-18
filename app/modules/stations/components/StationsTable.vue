<script setup lang="ts">
import StationStatusChip from '~/modules/stations/components/StationStatusChip.vue'
import { useStations } from '~/modules/stations/composables/useStations'
import type { StationsTableUpdate } from '~/modules/stations/composables/useStations'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

const { stations, total, pending, error, refresh, updateOptions } = useStations()
const filtersStore = useStationsFiltersStore()

// Skeleton solo al primo caricamento (nessun dato ancora in mano): per un
// refetch di pagina/ordinamento basta il loading inline di v-data-table,
// sostituire tutta la tabella con uno skeleton ad ogni click sarebbe un
// salto visivo peggiore del semplice spinner.
const isFirstLoad = computed(() => pending.value && stations.value.length === 0)

const headers = [
  { title: 'Name', key: 'name' },
  { title: 'Betreiber', key: 'operator' },
  { title: 'Stadt', key: 'town' },
  { title: 'Anschlüsse', key: 'connectors', sortable: false },
  { title: 'Max. Leistung', key: 'maxPowerKw', align: 'end' as const },
  { title: 'Status', key: 'operationalStatus' }
]

function connectorSummary(station: (typeof stations.value)[number]): string {
  if (station.connectors.length === 0) return '–'
  const types = [...new Set(station.connectors.map((connector) => connector.type))]
  return `${types.join(', ')} (${station.numberOfPoints})`
}

function formatPower(maxPowerKw: number | null): string {
  return maxPowerKw === null ? '–' : `${maxPowerKw} kW`
}

function onUpdateOptions(options: StationsTableUpdate) {
  updateOptions(options)
}

/**
 * Hover riga ↔ marker (Giorno 8): la riga scrive nello store al passaggio
 * del mouse, e si evidenzia anche quando è la mappa a impostare l'hover —
 * stessa `hoveredStationId` in entrambe le direzioni, vedi StationsMap.vue.
 * Click naviga al dettaglio (Giorno 9) — senza, il popup della mappa
 * resterebbe l'unico modo di raggiungerlo.
 */
function rowProps({ item }: { item: (typeof stations.value)[number] }) {
  return {
    onMouseenter: () => filtersStore.hover(item.id),
    onMouseleave: () => filtersStore.hover(null),
    onClick: () => navigateTo(`/stations/${item.id}`),
    class: filtersStore.hoveredStationId === item.id ? 'bg-surface-variant' : undefined,
    style: 'cursor: pointer'
  }
}
</script>

<template>
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4" data-testid="stations-error">
    <template #text> Die Stationen konnten nicht geladen werden. </template>
    <template #append>
      <v-btn variant="text" color="error" @click="refresh()">Erneut versuchen</v-btn>
    </template>
  </v-alert>

  <v-skeleton-loader v-else-if="isFirstLoad" type="table" data-testid="stations-skeleton" />

  <v-empty-state
    v-else-if="!pending && stations.length === 0"
    icon="mdi-ev-station"
    title="Keine Stationen gefunden"
    text="Für die aktuellen Filter gibt es keine Ergebnisse. Versuche es mit einem größeren Radius oder anderen Filtern."
    data-testid="stations-empty"
  />

  <v-data-table-server
    v-else
    :headers="headers"
    :items="stations"
    :items-length="total"
    :loading="pending"
    items-per-page-text="Zeilen pro Seite"
    density="comfortable"
    :row-props="rowProps"
    @update:options="onUpdateOptions"
  >
    <template #[`item.town`]="{ item }">
      {{ item.address.town ?? '–' }}
    </template>
    <template #[`item.connectors`]="{ item }">
      {{ connectorSummary(item) }}
    </template>
    <template #[`item.maxPowerKw`]="{ item }">
      {{ formatPower(item.maxPowerKw) }}
    </template>
    <template #[`item.operationalStatus`]="{ item }">
      <StationStatusChip :is-operational="item.isOperational" :label="item.operationalStatus" />
    </template>
  </v-data-table-server>
</template>
