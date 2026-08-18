<script setup lang="ts">
import type { ChargingSession } from '#shared/schemas/session'

const props = defineProps<{ sessions: ChargingSession[]; loading?: boolean }>()

const { t } = useI18n()
const { formatDateTime, formatCurrency } = useLocaleFormatters()

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
const headers = computed(() => [
  { title: t('sessions.table.station'), key: 'stationName' },
  { title: t('sessions.table.connector'), key: 'connectorType' },
  { title: t('sessions.table.start'), key: 'start' },
  { title: t('sessions.table.duration'), key: 'duration', align: 'end' as const },
  { title: t('sessions.table.energy'), key: 'energy', align: 'end' as const },
  { title: t('sessions.table.averagePower'), key: 'averagePower', align: 'end' as const },
  { title: t('sessions.table.peakPower'), key: 'peakPower', align: 'end' as const },
  { title: t('sessions.table.cost'), key: 'cost', align: 'end' as const }
])

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
    cost: formatCurrency(session.costEur)
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
      <p class="text-medium-emphasis pa-4 mb-0">{{ t('sessions.noResults') }}</p>
    </template>
  </v-data-table-virtual>
</template>
