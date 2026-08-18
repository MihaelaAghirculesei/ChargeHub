/**
 * Unico punto di export pubblico del modulo analytics. `analyticsRepository`
 * resta volutamente privato, stesso principio degli altri moduli.
 */
export { useAnalytics } from '~/modules/analytics/composables/useAnalytics'
export type { AnalyticsPeriodDays } from '~/modules/analytics/composables/useAnalytics'
export { useKpis } from '~/modules/analytics/composables/useKpis'
