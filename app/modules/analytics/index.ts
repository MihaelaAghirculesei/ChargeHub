/**
 * The single public export point of the analytics module.
 * `analyticsRepository` stays deliberately private, same principle as the
 * other modules.
 */
export { useAnalytics } from '~/modules/analytics/composables/useAnalytics'
export type { AnalyticsPeriodDays } from '~/modules/analytics/composables/useAnalytics'
export { useKpis } from '~/modules/analytics/composables/useKpis'
