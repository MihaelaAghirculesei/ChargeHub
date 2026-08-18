/**
 * Formattazione numeri/date/valuta per lingua attiva (Giorno 17): un solo
 * punto invece di `'de-DE'` sparso e scritto a mano in una dozzina di
 * componenti. `localeProperties.language` è il tag BCP-47 già dichiarato in
 * `nuxt.config.ts` per ciascuna lingua (`de-DE`/`en-US`) — non serve una
 * mappa a parte.
 */
export function useLocaleFormatters() {
  const { localeProperties } = useI18n()
  const tag = computed(() => localeProperties.value.language ?? 'de-DE')

  function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(tag.value, options).format(value)
  }

  /** L'app resta per il mercato tedesco (EUR sempre), solo la formattazione segue la lingua: "12,50 €" in tedesco, "€12.50" in inglese. */
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat(tag.value, { style: 'currency', currency: 'EUR' }).format(value)
  }

  function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(tag.value, options).format(new Date(value))
  }

  function formatDateTime(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(tag.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options
    }).format(new Date(value))
  }

  return { tag, formatNumber, formatCurrency, formatDate, formatDateTime }
}
