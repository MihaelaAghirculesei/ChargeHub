/**
 * KPI aggregato per la dashboard (Giorno 13), dato non-OCM: composto da
 * registro stazioni (Giorno 3-9) + telemetria simulata (Giorno 10-11) +
 * sessioni sintetiche (Giorno 12), non un nuovo simulatore. Vedi
 * server/services/kpi-aggregator.ts.
 *
 * Nessuna etichetta testuale qui (Giorno 17): il server non conosce la
 * lingua dell'utente, quindi restituisce solo `key` — il client traduce
 * `dashboard.kpi.<key>` con i18n. Un'etichetta tedesca cablata nella
 * risposta API resterebbe tedesca anche con l'interfaccia in inglese.
 */
export interface KpiSeries {
  key: string
  value: number
  unit: string
  /** Variazione percentuale tra 7 giorni fa e oggi. */
  trendPercent: number
  /** Un trend positivo è una buona notizia per questo KPI? (falso per "guasti": più guasti non è mai un bene). */
  higherIsBetter: boolean
  /** Una cifra per giorno, gli ultimi 7 giorni (oggi per ultima). */
  series: number[]
}
