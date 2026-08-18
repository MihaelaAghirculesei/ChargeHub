<script setup lang="ts">
import { compareTariffs } from '~/modules/tariffs/domain/compare-tariffs'
import type { Tariff } from '~/modules/tariffs/domain/tariff'
import { useSessions } from '~/modules/sessions'

const props = defineProps<{ tariffs: Tariff[] }>()

const { sessions } = useSessions()

const selectedSessionId = ref<string | null>(null)
const overstayMinutes = ref(0)

function formatSessionLabel(session: (typeof sessions.value)[number]): string {
  const when = new Date(session.startedAt).toLocaleString('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
  return `${session.stationName} · ${when} · ${session.energyKwh} kWh`
}

const sessionOptions = computed(() =>
  sessions.value.map((session) => ({ value: session.id, title: formatSessionLabel(session) }))
)

const selectedSession = computed(
  () => sessions.value.find((session) => session.id === selectedSessionId.value) ?? null
)

/**
 * `overstayMinutes` è manuale: le sessioni sintetiche (Giorno 12) non
 * modellano quanto un'auto resta collegata dopo la ricarica, vedi
 * calculate-session-cost.ts.
 */
const results = computed(() => {
  if (!selectedSession.value) return []
  return compareTariffs(
    { energyKwh: selectedSession.value.energyKwh },
    props.tariffs,
    overstayMinutes.value
  )
})
</script>

<template>
  <div>
    <v-row>
      <v-col cols="12" md="7">
        <v-select
          v-model="selectedSessionId"
          :items="sessionOptions"
          item-title="title"
          item-value="value"
          label="Sitzung auswählen"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="5">
        <v-text-field
          v-model.number="overstayMinutes"
          type="number"
          min="0"
          label="Standzeit nach Ladeende (Min., optional)"
          density="comfortable"
          hide-details
        />
      </v-col>
    </v-row>

    <p v-if="tariffs.length === 0" class="text-medium-emphasis mt-4 mb-0">
      Lege zuerst mindestens einen Tarif an.
    </p>
    <p v-else-if="!selectedSession" class="text-medium-emphasis mt-4 mb-0">
      Wähle eine Sitzung, um die Tarife zu vergleichen.
    </p>

    <v-table v-else density="comfortable" class="mt-4">
      <thead>
        <tr>
          <th scope="col">Tarif</th>
          <th scope="col" class="text-right">Kosten</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(result, index) in results"
          :key="result.tariffId"
          :class="{ 'font-weight-bold': index === 0 }"
        >
          <td>{{ result.tariffName }}</td>
          <td class="text-right">{{ result.costEur.toFixed(2) }} €</td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>
