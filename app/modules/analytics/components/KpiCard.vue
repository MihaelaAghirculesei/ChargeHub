<script setup lang="ts">
/**
 * A design-system component (not copy-paste for each KPI, as the plan
 * requires): generic value, trend and sparkline, driven by `higherIsBetter`
 * to know whether a positive trend is good news (it is not for "faulted") —
 * the card does not know the meaning of the specific KPI, only how to show
 * it consistently with the design system (ADR-0001 semantic roles:
 * success/error, never colour alone).
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

/**
 * A direct CSS value, not the class name `grey` (day 25, Lighthouse
 * Performance gate on /de/stations/47109): `$color-pack: false` in
 * app/assets/vuetify-settings.scss removes from the global CSS the
 * thousands of `.bg-*`/`.text-*` classes generated for every Material
 * Design colour × variant (243 KB of 248 KB of `entry.css`, 98% unused on
 * that page per the Lighthouse "unused-css-rules" audit) — only the
 * theme-bound utilities remain (primary/success/error/... and the
 * emphasis, always generated). The exact same colour as
 * `text-medium-emphasis` below, passed as a CSS value instead of a class
 * name that would no longer exist.
 */
const NEUTRAL_TREND_COLOR = 'rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity))'
const trendIconColor = computed(() =>
  trendColor.value === 'grey' ? NEUTRAL_TREND_COLOR : trendColor.value
)

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
      <div class="d-flex align-center ga-1 mb-2">
        <v-icon :icon="trendIcon" size="small" :color="trendIconColor" />
        <!--
          `text-grey` (grigio Vuetify fisso, ~#9e9e9e) non basta per un
          testo a 12px su sfondo card chiaro (contrasto 2.67, trovato con
          axe-core, Giorno 18): per il caso "invariato" si usa
          `text-medium-emphasis`, che eredita l'opacità già alzata per
          l'accessibilità (vedi accessibility.css) invece di un grigio
          indipendente dal tema.
        -->
        <span
          class="text-caption"
          :class="trendColor === 'grey' ? 'text-medium-emphasis' : `text-${trendColor}`"
        >
          {{ trendLabel }}
        </span>
      </div>
      <v-sparkline
        :model-value="series"
        :color="trendIconColor"
        height="40"
        line-width="2"
        padding="4"
        smooth
      />
    </v-card-text>
  </v-card>
</template>
