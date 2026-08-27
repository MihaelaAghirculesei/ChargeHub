<script setup lang="ts">
import { compareTariffs } from '~/modules/tariffs/domain/compare-tariffs'
import type { Tariff } from '~/modules/tariffs/domain/tariff'
import { useSessions } from '~/modules/sessions'

const props = defineProps<{ tariffs: Tariff[] }>()

const { t } = useI18n()
const { formatDateTime, formatCurrency } = useLocaleFormatters()
const { sessions } = useSessions()

const selectedSessionId = ref<string | null>(null)
const overstayMinutes = ref(0)

function formatSessionLabel(session: (typeof sessions.value)[number]): string {
  return `${session.stationName} · ${formatDateTime(session.startedAt)} · ${session.energyKwh} kWh`
}

const sessionOptions = computed(() =>
  sessions.value.map((session) => ({ value: session.id, title: formatSessionLabel(session) }))
)

const selectedSession = computed(
  () => sessions.value.find((session) => session.id === selectedSessionId.value) ?? null
)

/**
 * `overstayMinutes` is manual: the synthetic sessions (day 12) do not
 * model how long a car stays plugged in after charging, see
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
          :label="t('tariffs.selectSession')"
          density="comfortable"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="5">
        <v-text-field
          v-model.number="overstayMinutes"
          type="number"
          min="0"
          :label="t('tariffs.overstayMinutes')"
          density="comfortable"
          hide-details
        />
      </v-col>
    </v-row>

    <p v-if="tariffs.length === 0" class="text-medium-emphasis mt-4 mb-0">
      {{ t('tariffs.needTariff') }}
    </p>
    <p v-else-if="!selectedSession" class="text-medium-emphasis mt-4 mb-0">
      {{ t('tariffs.needSession') }}
    </p>

    <v-table v-else density="comfortable" class="mt-4">
      <thead>
        <tr>
          <th scope="col">{{ t('tariffs.tariffColumn') }}</th>
          <th scope="col" class="text-right">{{ t('tariffs.costColumn') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(result, index) in results"
          :key="result.tariffId"
          :class="{ 'font-weight-bold': index === 0 }"
        >
          <td>{{ result.tariffName }}</td>
          <td class="text-right">{{ formatCurrency(result.costEur) }}</td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>
