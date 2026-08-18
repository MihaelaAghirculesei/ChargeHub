<script setup lang="ts">
import { useStationReferenceData } from '~/modules/stations/composables/useStationReferenceData'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'
import type { StationFilterKey } from '~/modules/stations/types'

const { t } = useI18n()
const filtersStore = useStationsFiltersStore()
// Stessa chiave di useAsyncData della barra filtri: niente richiesta in più,
// solo il valore già cachato.
const { data: referenceData } = useStationReferenceData()

function titleFor(entries: { id: number; title: string }[] | undefined, id: number): string {
  return entries?.find((entry) => entry.id === id)?.title ?? `#${id}`
}

interface ActiveFilterChip {
  key: StationFilterKey
  label: string
}

const chips = computed<ActiveFilterChip[]>(() => {
  const filters = filtersStore.filters
  const list: ActiveFilterChip[] = []

  if (filters.search) {
    list.push({
      key: 'search',
      label: t('stations.activeFilters.search', { value: filters.search })
    })
  }
  if (filters.connectionTypeId !== undefined) {
    list.push({
      key: 'connectionTypeId',
      label: titleFor(referenceData.value?.connectionTypes, filters.connectionTypeId)
    })
  }
  if (filters.operatorId !== undefined) {
    list.push({
      key: 'operatorId',
      label: titleFor(referenceData.value?.operators, filters.operatorId)
    })
  }
  if (filters.statusTypeId !== undefined) {
    list.push({
      key: 'statusTypeId',
      label: titleFor(referenceData.value?.statusTypes, filters.statusTypeId)
    })
  }
  if (filters.minPowerKw !== undefined) {
    list.push({
      key: 'minPowerKw',
      label: t('stations.activeFilters.minPower', { value: filters.minPowerKw })
    })
  }

  return list
})

function remove(key: StationFilterKey) {
  filtersStore.setFilters({ [key]: undefined })
}
</script>

<template>
  <div
    v-if="chips.length > 0"
    class="d-flex flex-wrap align-center ga-2 mb-4"
    data-testid="active-filter-chips"
  >
    <v-chip
      v-for="chip in chips"
      :key="chip.key"
      closable
      size="small"
      variant="tonal"
      @click:close="remove(chip.key)"
    >
      {{ chip.label }}
    </v-chip>
    <v-btn
      variant="text"
      size="small"
      data-testid="clear-all-filters"
      @click="filtersStore.resetFilters()"
      >{{ t('stations.activeFilters.clearAll') }}</v-btn
    >
  </div>
</template>
