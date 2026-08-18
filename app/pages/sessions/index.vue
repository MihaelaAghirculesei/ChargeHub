<script setup lang="ts">
import SessionsFilterBar from '~/modules/sessions/components/SessionsFilterBar.vue'
import SessionsTable from '~/modules/sessions/components/SessionsTable.vue'
import { downloadCsv, sessionsToCsv } from '~/modules/sessions/csv-export'
import { useSessions } from '~/modules/sessions'

useSeoMeta({
  title: 'Sitzungen – ChargeHub',
  description: 'Ladesitzungen: Dauer, Energie, Leistung und Kosten pro Sitzung.'
})

const { sessions, pending, error } = useSessions()

const stationId = ref<number | null>(null)
const from = ref<string | null>(null)
const to = ref<string | null>(null)

const filteredSessions = computed(() =>
  sessions.value.filter((session) => {
    if (stationId.value !== null && session.stationId !== stationId.value) return false
    if (from.value && session.startedAt < `${from.value}T00:00:00.000Z`) return false
    if (to.value && session.startedAt > `${to.value}T23:59:59.999Z`) return false
    return true
  })
)

function exportCsv() {
  const csv = sessionsToCsv(filteredSessions.value)
  const today = new Date().toISOString().slice(0, 10)
  downloadCsv(csv, `chargehub-sitzungen-${today}.csv`)
}
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h1 class="text-h5">Sitzungen</h1>
      <v-btn
        prepend-icon="mdi-download"
        variant="tonal"
        :disabled="filteredSessions.length === 0"
        @click="exportCsv"
      >
        CSV exportieren
      </v-btn>
    </div>

    <SessionsFilterBar
      v-model:station-id="stationId"
      v-model:from="from"
      v-model:to="to"
      :sessions="sessions"
    />

    <v-alert
      v-if="error"
      type="error"
      class="mb-4"
      text="Sitzungen konnten nicht geladen werden."
    />

    <SessionsTable :sessions="filteredSessions" :loading="pending" />

    <p class="text-caption text-medium-emphasis mt-2 mb-0">
      {{ filteredSessions.length }} von {{ sessions.length }} Sitzungen
    </p>
  </v-container>
</template>
