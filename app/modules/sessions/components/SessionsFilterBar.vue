<script setup lang="ts">
import type { ChargingSession } from '#shared/schemas/session'

/**
 * Filters over the dataset already loaded in full by the client (see
 * `GET /api/sessions`, which accepts no filters on purpose): no network
 * round trip per station/period, the model is passed up to the parent
 * which applies the filter in a `computed` over an array already in memory.
 */
const props = defineProps<{ sessions: ChargingSession[] }>()

const { t } = useI18n()

const stationId = defineModel<number | null>('stationId', { default: null })
const from = defineModel<string | null>('from', { default: null })
const to = defineModel<string | null>('to', { default: null })

const stationOptions = computed(() => {
  const seen = new Map<number, string>()
  for (const session of props.sessions) {
    if (!seen.has(session.stationId)) seen.set(session.stationId, session.stationName)
  }
  return Array.from(seen, ([value, title]) => ({ value, title })).sort((a, b) =>
    a.title.localeCompare(b.title)
  )
})

function reset() {
  stationId.value = null
  from.value = null
  to.value = null
}
</script>

<template>
  <v-row dense class="mb-2">
    <v-col cols="12" sm="4">
      <v-select
        v-model="stationId"
        :items="stationOptions"
        item-title="title"
        item-value="value"
        :label="t('sessions.filters.station')"
        clearable
        density="comfortable"
        hide-details
      />
    </v-col>
    <v-col cols="6" sm="3">
      <v-text-field
        v-model="from"
        type="date"
        :label="t('sessions.filters.from')"
        density="comfortable"
        clearable
        hide-details
      />
    </v-col>
    <v-col cols="6" sm="3">
      <v-text-field
        v-model="to"
        type="date"
        :label="t('sessions.filters.to')"
        density="comfortable"
        clearable
        hide-details
      />
    </v-col>
    <v-col cols="12" sm="2" class="d-flex align-center">
      <v-btn variant="text" @click="reset">{{ t('sessions.filters.reset') }}</v-btn>
    </v-col>
  </v-row>
</template>
