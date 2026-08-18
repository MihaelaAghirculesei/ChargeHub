<script setup lang="ts">
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js'
import { Line } from 'vue-chartjs'
import type { HourlyUtilizationPoint } from '#shared/schemas/analytics'
import { useChartThemeColors } from '~/modules/analytics/theme-colors'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

const props = defineProps<{ data: HourlyUtilizationPoint[] }>()

const { colorFor } = useChartThemeColors()

const chartData = computed(() => ({
  labels: props.data.map((point) => `${point.hour}:00`),
  datasets: [
    {
      label: 'Auslastung %',
      data: props.data.map((point) => point.utilizationPercent),
      borderColor: colorFor('info'),
      backgroundColor: colorFor('info'),
      tension: 0.3
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: { y: { beginAtZero: true, max: 100 } }
}
</script>

<template>
  <div>
    <ClientOnly>
      <div style="height: 260px">
        <Line :data="chartData" :options="chartOptions" />
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
      <v-expansion-panel title="Als Tabelle anzeigen" eager>
        <template #text>
          <v-table density="compact">
            <thead>
              <tr>
                <th scope="col">Stunde</th>
                <th scope="col" class="text-right">Auslastung %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="point in data" :key="point.hour">
                <td>{{ point.hour }}:00</td>
                <td class="text-right">{{ point.utilizationPercent }}</td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
