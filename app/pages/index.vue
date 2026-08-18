<script setup lang="ts">
import KpiCard from '~/modules/analytics/components/KpiCard.vue'
import { useKpis } from '~/modules/analytics'

useSeoMeta({
  title: 'Dashboard – ChargeHub',
  description: 'Überblick über Stationen, Ladepunkte, Nutzung und Energie der letzten 7 Tage.'
})

const { kpis, pending, error } = useKpis()
</script>

<template>
  <v-container class="py-8">
    <h1 class="text-h5 mb-4">Dashboard</h1>

    <v-alert v-if="error" type="error" class="mb-4" text="KPIs konnten nicht geladen werden." />

    <v-row v-if="pending && kpis.length === 0">
      <v-col v-for="n in 6" :key="n" cols="12" sm="6" md="4">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col v-for="item in kpis" :key="item.key" cols="12" sm="6" md="4">
        <KpiCard
          :label="item.label"
          :value="item.value"
          :unit="item.unit"
          :trend-percent="item.trendPercent"
          :higher-is-better="item.higherIsBetter"
          :series="item.series"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
