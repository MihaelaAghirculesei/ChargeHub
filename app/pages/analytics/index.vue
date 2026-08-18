<script setup lang="ts">
import EnergyByDayChart from '~/modules/analytics/components/EnergyByDayChart.vue'
import StatusDistributionChart from '~/modules/analytics/components/StatusDistributionChart.vue'
import UtilizationByHourChart from '~/modules/analytics/components/UtilizationByHourChart.vue'
import type { AnalyticsPeriodDays } from '~/modules/analytics'
import { useAnalytics } from '~/modules/analytics'

useSeoMeta({
  title: 'Auswertungen – ChargeHub',
  description: 'Energie pro Tag, Statusverteilung und Auslastung nach Stunde.'
})

const period = ref<AnalyticsPeriodDays>(30)
const periodOptions: { title: string; value: AnalyticsPeriodDays }[] = [
  { title: '7 Tage', value: 7 },
  { title: '30 Tage', value: 30 },
  { title: '90 Tage', value: 90 }
]

const { analytics, pending, error } = useAnalytics(period)
</script>

<template>
  <v-container class="py-8">
    <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-2">
      <h1 class="text-h5">Auswertungen</h1>
      <v-btn-toggle v-model="period" mandatory density="comfortable" color="primary">
        <v-btn v-for="option in periodOptions" :key="option.value" :value="option.value">
          {{ option.title }}
        </v-btn>
      </v-btn-toggle>
    </div>

    <v-alert
      v-if="error"
      type="error"
      class="mb-4"
      text="Auswertungen konnten nicht geladen werden."
    />

    <v-row v-if="pending && !analytics">
      <v-col cols="12" md="6"><v-skeleton-loader type="card" /></v-col>
      <v-col cols="12" md="6"><v-skeleton-loader type="card" /></v-col>
      <v-col cols="12"><v-skeleton-loader type="card" /></v-col>
    </v-row>

    <v-row v-else-if="analytics">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-item>
            <v-card-title>kWh pro Tag</v-card-title>
          </v-card-item>
          <v-card-text>
            <EnergyByDayChart :data="analytics.energyByDay" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-item>
            <v-card-title>Statusverteilung</v-card-title>
          </v-card-item>
          <v-card-text>
            <StatusDistributionChart :data="analytics.statusDistribution" />
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12">
        <v-card>
          <v-card-item>
            <v-card-title>Auslastung nach Stunde</v-card-title>
          </v-card-item>
          <v-card-text>
            <UtilizationByHourChart :data="analytics.utilizationByHour" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
