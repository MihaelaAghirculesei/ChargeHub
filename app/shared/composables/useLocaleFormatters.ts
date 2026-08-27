/**
 * Number/date/currency formatting for the active language (day 17): a
 * single place instead of `'de-DE'` scattered and hand-written in a dozen
 * components. `localeProperties.language` is the BCP-47 tag already declared
 * in `nuxt.config.ts` for each language (`de-DE`/`en-US`) — no separate map
 * needed.
 *
 * Module-level formatter cache (not per call): building an
 * `Intl.NumberFormat`/`Intl.DateTimeFormat` is a measurably expensive
 * operation (locale/plural resolution), not a plain constructor. The
 * sessions table (day 12, ~2000 rows) recreated one per row — found with
 * Lighthouse: Performance 52 and Total Blocking Time >1000ms against
 * Performance 83-88 on the other pages, which call these same formatters but
 * on few rows. A formatter is immutable/stateless once created, so reusing
 * it across calls (even from different components) is safe — the key
 * includes the language tag, so a language change never reuses the wrong
 * formatter.
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

  /** The app stays for the German market (EUR always), only the formatting follows the language: "12,50 €" in German, "€12.50" in English. */
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
