<script setup lang="ts">
import { useStationReferenceData } from '~/modules/stations/composables/useStationReferenceData'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

const { t } = useI18n()
const filtersStore = useStationsFiltersStore()
const { data: referenceData, pending: referenceDataPending } = useStationReferenceData()

// Local input for immediate feedback while typing; the real filter (which
// re-fetches and rewrites the URL) updates only 300ms after the last
// keystroke, as the plan requires — no request on every character.
const searchInput = ref(filtersStore.filters.search ?? '')
const searchDebounced = refDebounced(searchInput, 300)
watch(searchDebounced, (value) => {
  filtersStore.setFilters({ search: value.trim() || undefined })
})

function toReferenceItems(entries: { id: number; title: string }[] | undefined) {
  return (entries ?? []).map((entry) => ({ title: entry.title, value: entry.id }))
}

const connectorTypeItems = computed(() => toReferenceItems(referenceData.value?.connectionTypes))
const operatorItems = computed(() => toReferenceItems(referenceData.value?.operators))
const statusItems = computed(() => toReferenceItems(referenceData.value?.statusTypes))

const connectionTypeId = computed<number | null>({
  get: () => filtersStore.filters.connectionTypeId ?? null,
  set: (value) => filtersStore.setFilters({ connectionTypeId: value ?? undefined })
})

const operatorId = computed<number | null>({
  get: () => filtersStore.filters.operatorId ?? null,
  set: (value) => filtersStore.setFilters({ operatorId: value ?? undefined })
})

const statusTypeId = computed<number | null>({
  get: () => filtersStore.filters.statusTypeId ?? null,
  set: (value) => filtersStore.setFilters({ statusTypeId: value ?? undefined })
})

const minPowerKw = computed<number | null>({
  get: () => filtersStore.filters.minPowerKw ?? null,
  set: (value) => {
    const power = Number(value)
    filtersStore.setFilters({ minPowerKw: value && power > 0 ? power : undefined })
  }
})
</script>

<template>
  <v-row>
    <v-col cols="12" md="4">
      <v-text-field
        v-model="searchInput"
        :label="t('stations.filters.search')"
        prepend-inner-icon="mdi-magnify"
        clearable
        hide-details
        density="comfortable"
      />
    </v-col>
    <v-col cols="6" md="2">
      <v-select
        v-model="connectionTypeId"
        :items="connectorTypeItems"
        :loading="referenceDataPending"
        :label="t('stations.filters.connectionType')"
        clearable
        hide-details
        density="comfortable"
      />
    </v-col>
    <v-col cols="6" md="2">
      <v-select
        v-model="operatorId"
        :items="operatorItems"
        :loading="referenceDataPending"
        :label="t('stations.filters.operator')"
        clearable
        hide-details
        density="comfortable"
      />
    </v-col>
    <v-col cols="6" md="2">
      <v-select
        v-model="statusTypeId"
        :items="statusItems"
        :loading="referenceDataPending"
        :label="t('stations.filters.status')"
        clearable
        hide-details
        density="comfortable"
      />
    </v-col>
    <v-col cols="6" md="2">
      <v-text-field
        v-model.number="minPowerKw"
        type="number"
        min="0"
        :label="t('stations.filters.minPower')"
        clearable
        hide-details
        density="comfortable"
      />
    </v-col>
  </v-row>
</template>
