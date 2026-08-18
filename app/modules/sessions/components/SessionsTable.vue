<script setup lang="ts">
import type { ChargingSession } from '#shared/schemas/session'

const props = defineProps<{ sessions: ChargingSession[]; loading?: boolean }>()

/**
 * `v-data-table-virtual`, non `-server`: le sessioni sono già tutte in
 * memoria (nessuna paginazione server, vedi `server/api/sessions.get.ts`) —
 * è la virtualizzazione client a reggere lo scroll su migliaia di righe,
 * non un fetch a pagine.
 *
 * Righe pre-formattate in un `computed` (non slot per colonna `#item.chiave`):
 * i nomi di slot con un punto sono una convenzione di Vuetify che
 * `eslint-plugin-vue` non riconosce (li tratta come modificatori non
 * supportati su `v-slot`, `vue/valid-v-slot`) — pre-formattare evita lo
 * scontro con il linter e tiene il componente tabella "muto".
 */
const headers = [
  { title: 'Station', key: 'stationName' },
  { title: 'Anschluss', key: 'connectorType' },
  { title: 'Start', key: 'start' },
  { title: 'Dauer', key: 'duration', align: 'end' as const },
  { title: 'Energie', key: 'energy', align: 'end' as const },
  { title: 'Ø Leistung', key: 'averagePower', align: 'end' as const },
  { title: 'Spitze', key: 'peakPower', align: 'end' as const },
  { title: 'Kosten', key: 'cost', align: 'end' as const }
]

interface SessionRow {
  id: string
  stationName: string
  connectorType: string
  start: string
  duration: string
  energy: string
  averagePower: string
  peakPower: string
  cost: string
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

const rows = computed<SessionRow[]>(() =>
  props.sessions.map((session) => ({
    id: session.id,
    stationName: session.stationName,
    connectorType: session.connectorType,
    start: formatDateTime(session.startedAt),
    duration: `${session.durationMinutes} min`,
    energy: `${session.energyKwh} kWh`,
    averagePower: `${session.averagePowerKw} kW`,
    peakPower: `${session.peakPowerKw} kW`,
    cost: `${session.costEur.toFixed(2)} €`
  }))
)
</script>

<template>
  <v-data-table-virtual
    :headers="headers"
    :items="rows"
    :loading="loading"
    item-value="id"
    height="600"
    fixed-header
  >
    <template #no-data>
      <p class="text-medium-emphasis pa-4 mb-0">Keine Sitzungen für diese Filter gefunden.</p>
    </template>
  </v-data-table-virtual>
</template>
