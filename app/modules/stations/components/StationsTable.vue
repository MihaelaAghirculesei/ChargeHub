<script setup lang="ts">
import StationStatusChip from '~/modules/stations/components/StationStatusChip.vue'
import { useStations } from '~/modules/stations/composables/useStations'
import type { StationsTableUpdate } from '~/modules/stations/composables/useStations'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

const { t } = useI18n()
const { name: breakpoint } = useDisplay()
const { stations, total, pending, error, refresh, updateOptions } = useStations()
const filtersStore = useStationsFiltersStore()

// Skeleton only on first load (no data in hand yet): for a page/sort
// re-fetch v-data-table's inline loading is enough, replacing the whole
// table with a skeleton on every click would be a worse visual jump than
// the plain spinner.
const isFirstLoad = computed(() => pending.value && stations.value.length === 0)

// `useDisplay()` reports the SSR fallback breakpoint on the server and the
// real one on the client; narrowing the columns before hydration finishes
// would be a hydration mismatch (the console-errors e2e gate guards this
// class of bug). Every column until mounted, then responsive.
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

// Six columns need ~720px, so on a phone the table scrolled sideways off
// the screen. Drop the least essential ones per breakpoint down to just
// name + status on the narrowest — the row still opens the full detail on
// tap. Column order is preserved so the visible set is always a prefix
// pattern of the full one.
const headers = computed(() => {
  const all = [
    { title: t('stations.table.name'), key: 'name' },
    { title: t('stations.table.operator'), key: 'operator' },
    { title: t('stations.table.town'), key: 'town' },
    { title: t('stations.table.connectors'), key: 'connectors', sortable: false },
    { title: t('stations.table.maxPower'), key: 'maxPowerKw', align: 'end' as const },
    { title: t('stations.table.status'), key: 'operationalStatus' }
  ]
  const hidden: Record<string, string[]> = {
    xs: ['operator', 'town', 'connectors', 'maxPowerKw'],
    sm: ['town', 'connectors']
  }
  const drop = hydrated.value ? (hidden[breakpoint.value] ?? []) : []
  return all.filter((header) => !drop.includes(header.key))
})

function connectorSummary(station: (typeof stations.value)[number]): string {
  if (station.connectors.length === 0) return '–'
  const types = [
    ...new Set(station.connectors.map((connector) => connector.type ?? t('common.unknown')))
  ]
  return `${types.join(', ')} (${station.numberOfPoints})`
}

function formatPower(maxPowerKw: number | null): string {
  return maxPowerKw === null ? '–' : `${maxPowerKw} kW`
}

function onUpdateOptions(options: StationsTableUpdate) {
  updateOptions(options)
}

/**
 * Row ↔ marker hover (day 8): the row writes to the store on mouseover, and
 * highlights itself when the map is the one setting the hover — the same
 * `hoveredStationId` in both directions, see StationsMap.vue. Click
 * navigates to the detail (day 9) — without it, the map popup would be the
 * only way to reach it.
 */
const localePath = useLocalePath()

function rowProps({ item }: { item: (typeof stations.value)[number] }) {
  return {
    onMouseenter: () => filtersStore.hover(item.id),
    onMouseleave: () => filtersStore.hover(null),
    onClick: () => navigateTo(localePath(`/stations/${item.id}`)),
    class: filtersStore.hoveredStationId === item.id ? 'bg-surface-variant' : undefined,
    style: 'cursor: pointer'
  }
}
</script>

<template>
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4" data-testid="stations-error">
    <template #text> {{ t('stations.loadError') }} </template>
    <template #append>
      <v-btn variant="text" color="error" @click="refresh()">{{ t('common.retry') }}</v-btn>
    </template>
  </v-alert>

  <v-skeleton-loader v-else-if="isFirstLoad" type="table" data-testid="stations-skeleton" />

  <v-empty-state
    v-else-if="!pending && stations.length === 0"
    icon="mdi-ev-station"
    :title="t('stations.empty.title')"
    :text="t('stations.empty.text')"
    data-testid="stations-empty"
  />

  <!--
    No `items-per-page-text`: without an override, Vuetify takes it from
    `$vuetify.dataTable.itemsPerPageText` (de/en locale merged in
    `i18n/locales/`, day 17) — a value written here by hand would stay in
    the wrong language when switching to `en`.
  -->
  <!--
    No "All" (-1) in the per-page options: OCM caps a fetch at 100 results
    (`maxresults`), so 100 already shows every row, and the server rejects
    a non-positive `itemsperpage` (400 -> "Stations could not be loaded").
  -->
  <v-data-table-server
    v-else
    :headers="headers"
    :items="stations"
    :items-length="total"
    :items-per-page-options="[10, 25, 50, 100]"
    :loading="pending"
    density="comfortable"
    :row-props="rowProps"
    @update:options="onUpdateOptions"
  >
    <template #[`item.name`]="{ item }">
      {{ item.name ?? t('common.unknown') }}
    </template>
    <template #[`item.operator`]="{ item }">
      {{ item.operator ?? t('common.unknown') }}
    </template>
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
      <StationStatusChip
        :is-operational="item.isOperational"
        :label="item.operationalStatus ?? t('common.unknown')"
      />
    </template>
  </v-data-table-server>
</template>
