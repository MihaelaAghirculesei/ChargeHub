<script setup lang="ts">
import type { ChargingSession } from '#shared/schemas/session'

const props = defineProps<{ sessions: ChargingSession[]; loading?: boolean }>()

const { t } = useI18n()
const { formatDateTime, formatCurrency } = useLocaleFormatters()

/**
 * `v-data-table-virtual`, not `-server`: the sessions are all in memory
 * already (no server pagination, see `server/api/sessions.get.ts`) — it is
 * client virtualisation that carries the scroll over thousands of rows, not
 * a paged fetch.
 *
 * Rows pre-formatted in a `computed` (not per-column `#item.key` slots):
 * slot names with a dot are a Vuetify convention that `eslint-plugin-vue`
 * does not recognise (it treats them as unsupported modifiers on `v-slot`,
 * `vue/valid-v-slot`) — pre-formatting avoids the clash with the linter and
 * keeps the table component "dumb".
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
