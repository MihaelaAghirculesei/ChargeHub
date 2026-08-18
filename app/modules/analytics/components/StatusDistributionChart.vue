<script setup lang="ts">
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
import type { StatusDistributionPoint } from '#shared/schemas/analytics'
import { useChartThemeColors } from '~/modules/analytics/theme-colors'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{ data: StatusDistributionPoint[] }>()

const { t } = useI18n()
const { colorFor } = useChartThemeColors()

function statusLabel(status: StatusDistributionPoint['status']): string {
  return t(`chargePointStatus.${status}`)
}

/** Stessi ruoli semantici della palette di dominio, docs/adr/0001-design-system.md. */
const STATUS_COLOR_KEYS: Record<StatusDistributionPoint['status'], string> = {
  Available: 'success',
  Charging: 'info',
  Faulted: 'error',
  Offline: 'surface-variant'
}

const chartData = computed(() => ({
  labels: props.data.map((point) => statusLabel(point.status)),
  datasets: [
    {
      data: props.data.map((point) => point.count),
      backgroundColor: props.data.map((point) => colorFor(STATUS_COLOR_KEYS[point.status]))
    }
  ]
}))

const chartOptions = { responsive: true, maintainAspectRatio: false }
</script>

<template>
  <div>
    <ClientOnly>
      <div style="height: 260px">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>
      <template #fallback>
        <v-skeleton-loader type="image" height="260" />
      </template>
    </ClientOnly>

    <!--
      Tabella alternativa accessibile: un grafico canvas è invisibile a uno
      screen reader. `eager` forza il contenuto del pannello nel DOM fin da
      subito (Vuetify altrimenti lo monta solo all'apertura): senza, la
      tabella non esiste nell'HTML SSR finché qualcuno non clicca, il che
      vanifica il punto di averla — verificato con un curl sull'HTML grezzo.
    -->
    <v-expansion-panels class="mt-2">
      <v-expansion-panel :title="t('analytics.showAsTable')" eager>
        <template #text>
          <v-table density="compact">
            <thead>
              <tr>
                <th scope="col">{{ t('analytics.statusColumn') }}</th>
                <th scope="col" class="text-right">{{ t('analytics.countColumn') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="point in data" :key="point.status">
                <td>{{ statusLabel(point.status) }}</td>
                <td class="text-right">{{ point.count }}</td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
