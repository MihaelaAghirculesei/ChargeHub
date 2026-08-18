<script setup lang="ts">
import { useStationReferenceData } from '~/modules/stations/composables/useStationReferenceData'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

const filtersStore = useStationsFiltersStore()
const { data: referenceData, pending: referenceDataPending } = useStationReferenceData()

// Input locale per il feedback immediato mentre si digita; il filtro vero
// (che rifetcha e riscrive l'URL) si aggiorna solo 300ms dopo l'ultima
// battitura, come richiesto dal piano — niente richiesta ad ogni carattere.
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
        label="Suche (Name, Betreiber, Stadt)"
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
        label="Anschlusstyp"
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
        label="Betreiber"
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
        label="Status"
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
        label="Min. Leistung (kW)"
        clearable
        hide-details
        density="comfortable"
      />
    </v-col>
  </v-row>
</template>
