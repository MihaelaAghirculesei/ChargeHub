<script setup lang="ts">
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { DailyEnergyPoint } from '#shared/schemas/analytics'
import { useChartThemeColors } from '~/modules/analytics/theme-colors'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{ data: DailyEnergyPoint[] }>()

const { t } = useI18n()
const { colorFor } = useChartThemeColors()
const { formatDate } = useLocaleFormatters()

function formatAxisDate(iso: string): string {
  return formatDate(iso, { day: '2-digit', month: '2-digit' })
}

const chartData = computed(() => ({
  labels: props.data.map((point) => formatAxisDate(point.date)),
  datasets: [
    {
      label: 'kWh',
      data: props.data.map((point) => point.energyKwh),
      backgroundColor: colorFor('primary')
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: { y: { beginAtZero: true } }
}
</script>

<template>
  <div>
    <ClientOnly>
      <div style="height: 260px">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <template #fallback>
        <v-skeleton-loader type="image" height="260" />
      </template>
    </ClientOnly>

    <!--
      `eager`: senza, Vuetify monta il contenuto del pannello solo
      all'apertura e la tabella non esiste nell'HTML SSR — vedi
      StatusDistributionChart.vue per il dettaglio.
    -->
    <v-expansion-panels class="mt-2">
      <v-expansion-panel :title="t('analytics.showAsTable')" eager>
        <template #text>
          <v-table density="compact">
            <thead>
              <tr>
                <th scope="col">{{ t('analytics.dateColumn') }}</th>
                <th scope="col" class="text-right">kWh</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="point in data" :key="point.date">
                <td>{{ point.date }}</td>
                <td class="text-right">{{ point.energyKwh }}</td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
