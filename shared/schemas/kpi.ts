/**
 * Aggregated KPI for the dashboard, non-OCM data: composed from the
 * station registry + simulated telemetry + synthetic
 * sessions, not a new simulator. See
 * server/services/kpi-aggregator.ts.
 *
 * No text labels here: the server does not know the user's
 * language, so it returns only `key` — the client translates
 * `dashboard.kpi.<key>` via i18n. A German label baked into the API
 * response would stay German even with the UI in English.
 */
export interface KpiSeries {
  key: string
  value: number
  unit: string
  /** Percentage change between 7 days ago and today. */
  trendPercent: number
  /** Is a positive trend good news for this KPI? (false for "faulted": more faults is never good). */
  higherIsBetter: boolean
  /** One figure per day, the last 7 days (today last). */
  series: number[]
}
