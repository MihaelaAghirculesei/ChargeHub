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

/**
 * Valore CSS diretto, non il nome di classe `grey` (Giorno 25, gate
 * Lighthouse Performance su /de/stations/47109): `$color-pack: false` in
 * app/assets/vuetify-settings.scss toglie dal CSS globale le migliaia di
 * classi `.bg-*`/`.text-*` generate per ogni colore Material Design ×
 * variante (243 KB su 248 KB di `entry.css`, 98% inutilizzato su quella
 * pagina secondo l'audit Lighthouse "unused-css-rules") — restano solo le
 * utility legate al tema (primary/success/error/... e le emphasis,
 * sempre generate). Stesso identico colore di `text-medium-emphasis` qui
 * sotto, passato come valore CSS invece che come nome di classe che non
 * esisterebbe più.
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
