/**
 * Formattazione numeri/date/valuta per lingua attiva (Giorno 17): un solo
 * punto invece di `'de-DE'` sparso e scritto a mano in una dozzina di
 * componenti. `localeProperties.language` è il tag BCP-47 già dichiarato in
 * `nuxt.config.ts` per ciascuna lingua (`de-DE`/`en-US`) — non serve una
 * mappa a parte.
 *
 * Cache dei formatter a livello di modulo (non per chiamata): costruire un
 * `Intl.NumberFormat`/`Intl.DateTimeFormat` è un'operazione misurabilmente
 * costosa (risoluzione locale/plurali), non un semplice costruttore. La
 * tabella sessioni (Giorno 12, ~2000 righe) ne ricreava uno per riga —
 * trovato con Lighthouse: Performance 52 e Total Blocking Time >1000ms
 * contro Performance 83-88 delle altre pagine, che chiamano questi stessi
 * formatter ma su poche righe. Un formatter è immutabile/senza stato una
 * volta creato, quindi riusarlo tra chiamate (anche di componenti diversi)
 * è sicuro — la chiave include il tag lingua, così un cambio lingua non
 * riusa mai il formatter sbagliato.
 */
const numberFormatterCache = new Map<string, Intl.NumberFormat>()
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>()

function getNumberFormatter(tag: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${tag}::${JSON.stringify(options ?? {})}`
  let formatter = numberFormatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag, options)
    numberFormatterCache.set(key, formatter)
  }
  return formatter
}

function getDateTimeFormatter(
  tag: string,
  options?: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const key = `${tag}::${JSON.stringify(options ?? {})}`
  let formatter = dateTimeFormatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag, options)
    dateTimeFormatterCache.set(key, formatter)
  }
  return formatter
}

export function useLocaleFormatters() {
  const { localeProperties } = useI18n()
  const tag = computed(() => localeProperties.value.language ?? 'de-DE')

  function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return getNumberFormatter(tag.value, options).format(value)
  }

  /** L'app resta per il mercato tedesco (EUR sempre), solo la formattazione segue la lingua: "12,50 €" in tedesco, "€12.50" in inglese. */
  function formatCurrency(value: number): string {
    return getNumberFormatter(tag.value, { style: 'currency', currency: 'EUR' }).format(value)
  }

  function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
    return getDateTimeFormatter(tag.value, options).format(new Date(value))
  }

  function formatDateTime(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
    return getDateTimeFormatter(tag.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options
    }).format(new Date(value))
  }

  return { tag, formatNumber, formatCurrency, formatDate, formatDateTime }
}
