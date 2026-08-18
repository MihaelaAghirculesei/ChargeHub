<script setup lang="ts">
/**
 * Componente del design system (non copia-incolla per ogni KPI, come
 * richiesto dal piano): valore, trend e sparkline generici, guidati da
 * `higherIsBetter` per sapere se un trend positivo è una buona notizia
 * (non lo è per "guasti") — la card non conosce il significato del KPI
 * specifico, solo come mostrarlo in modo coerente col design system
 * (ruoli semantici di ADR-0001: success/error, mai colore da solo).
 */
const props = defineProps<{
  label: string
  value: number
  unit: string
  trendPercent: number
  higherIsBetter: boolean
  series: number[]
}>()

const { t } = useI18n()
const { formatNumber } = useLocaleFormatters()

const trendColor = computed<'success' | 'error' | 'grey'>(() => {
  if (props.trendPercent === 0) return 'grey'
  const isGood = props.higherIsBetter ? props.trendPercent > 0 : props.trendPercent < 0
  return isGood ? 'success' : 'error'
})

const trendIcon = computed(() => {
  if (props.trendPercent === 0) return 'mdi-minus'
  return props.trendPercent > 0 ? 'mdi-arrow-up' : 'mdi-arrow-down'
})

const trendLabel = computed(() => {
  if (props.trendPercent === 0) return t('dashboard.trendUnchanged')
  const sign = props.trendPercent > 0 ? '+' : ''
  return t('dashboard.trendWindow', { value: `${sign}${props.trendPercent.toFixed(1)}` })
})

const formattedValue = computed(() => {
  const formatted = formatNumber(props.value, { maximumFractionDigits: 1 })
  return props.unit ? `${formatted} ${props.unit}` : formatted
})
</script>

<template>
  <v-card>
    <v-card-item>
      <v-card-subtitle>{{ label }}</v-card-subtitle>
      <v-card-title class="text-h5">{{ formattedValue }}</v-card-title>
    </v-card-item>
    <v-card-text>
      <div class="d-flex align-center ga-1 mb-2" :class="`text-${trendColor}`">
        <v-icon :icon="trendIcon" size="small" />
        <span class="text-caption">{{ trendLabel }}</span>
      </div>
      <v-sparkline
        :model-value="series"
        :color="trendColor"
        height="40"
        line-width="2"
        padding="4"
        smooth
      />
    </v-card-text>
  </v-card>
</template>
