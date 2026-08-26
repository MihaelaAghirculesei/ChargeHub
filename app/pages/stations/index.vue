<script setup lang="ts">
import StationsActiveFilterChips from '~/modules/stations/components/StationsActiveFilterChips.vue'
import StationsFilterBar from '~/modules/stations/components/StationsFilterBar.vue'
import StationsMap from '~/modules/stations/components/StationsMap.vue'
import StationsNlSearchBar from '~/modules/stations/components/StationsNlSearchBar.vue'
import StationsTable from '~/modules/stations/components/StationsTable.vue'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'
import type { StationsViewMode } from '~/modules/stations/types'

const { t } = useI18n()

useSeoMeta({ title: t('stations.seoTitle') })

const filtersStore = useStationsFiltersStore()

const viewModeOptions = computed<{ value: StationsViewMode; icon: string; label: string }[]>(() => [
  { value: 'map', icon: 'mdi-map', label: t('stations.viewMode.map') },
  { value: 'list', icon: 'mdi-format-list-bulleted', label: t('stations.viewMode.list') },
  { value: 'split', icon: 'mdi-view-split-vertical', label: t('stations.viewMode.split') }
])

function onViewModeChange(value: unknown) {
  if (value === 'map' || value === 'list' || value === 'split') filtersStore.setViewMode(value)
}
</script>

<template>
  <v-container class="py-8" fluid>
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h1 class="text-h5">{{ t('stations.title') }}</h1>
      <v-btn-toggle
        :model-value="filtersStore.viewMode"
        density="comfortable"
        variant="outlined"
        mandatory
        @update:model-value="onViewModeChange"
      >
        <v-btn
          v-for="option in viewModeOptions"
          :key="option.value"
          :value="option.value"
          :prepend-icon="option.icon"
        >
          {{ option.label }}
        </v-btn>
      </v-btn-toggle>
    </div>

    <StationsNlSearchBar />
    <StationsFilterBar class="mb-4" />
    <StationsActiveFilterChips />

    <v-row v-if="filtersStore.viewMode === 'split'">
      <v-col cols="12" md="6">
        <StationsMap />
      </v-col>
      <v-col cols="12" md="6">
        <StationsTable />
      </v-col>
    </v-row>
    <template v-else>
      <StationsMap v-if="filtersStore.viewMode === 'map'" class="mb-6" />
      <StationsTable v-else />
    </template>
  </v-container>
</template>
