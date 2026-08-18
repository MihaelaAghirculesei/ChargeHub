<script setup lang="ts">
import KpiCard from '~/modules/analytics/components/KpiCard.vue'
import { useKpis } from '~/modules/analytics'

const { t } = useI18n()

useSeoMeta({
  title: t('dashboard.seoTitle'),
  description: t('dashboard.seoDescription')
})

const { kpis, pending, error } = useKpis()
</script>

<template>
  <v-container class="py-8">
    <h1 class="text-h5 mb-4">{{ t('dashboard.title') }}</h1>

    <v-alert v-if="error" type="error" class="mb-4" :text="t('dashboard.loadError')" />

    <v-row v-if="pending && kpis.length === 0">
      <v-col v-for="n in 6" :key="n" cols="12" sm="6" md="4">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col v-for="item in kpis" :key="item.key" cols="12" sm="6" md="4">
        <KpiCard
          :label="t(`dashboard.kpi.${item.key}`)"
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
