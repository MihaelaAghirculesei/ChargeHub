import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { useLocaleFormatters } from '~/shared/composables/useLocaleFormatters'

/**
 * `useI18n()` (inside `useLocaleFormatters`) needs the i18n plugin
 * registered on a real Nuxt app — same reason/pattern as
 * useStations.test.ts for `useAsyncData`. The test environment's default
 * locale is `de` (`detectBrowserLanguage: false`, day 17), so every assert
 * below assumes `de-DE`.
 */
const FormattersHost = defineComponent({
  setup() {
    return useLocaleFormatters()
  },
  template: '<div />'
})

describe('useLocaleFormatters', () => {
  it('tag resolves to the BCP-47 of the active locale (de-DE, the default in this environment)', async () => {
    const wrapper = await mountSuspended(FormattersHost)
    expect(wrapper.vm.tag).toBe('de-DE')
  })

  it('formatNumber uses the comma as the decimal separator in German', async () => {
    const wrapper = await mountSuspended(FormattersHost)
    expect(wrapper.vm.formatNumber(1234.5)).toBe('1.234,5')
  })

  it('formatCurrency always stays in EUR, formatted per the locale', async () => {
    const wrapper = await mountSuspended(FormattersHost)
    // No match on the exact space between number and symbol: `Intl` in
    // German uses a non-breaking space (depends on the ICU version), not a
    // normal space — \s covers it either way.
    expect(wrapper.vm.formatCurrency(12.5)).toMatch(/^12,50\s€$/)
  })

  it('formatDate respects the options passed', async () => {
    const wrapper = await mountSuspended(FormattersHost)
    expect(
      wrapper.vm.formatDate('2026-08-19', { year: 'numeric', month: '2-digit', day: '2-digit' })
    ).toBe('19.08.2026')
  })

  it('formatDateTime has a sensible default (dateStyle medium, timeStyle short)', async () => {
    const wrapper = await mountSuspended(FormattersHost)
    // Not an exact value (depends on CI's timezone): only that it contains
    // both the date and a time in the German format (HH:MM).
    expect(wrapper.vm.formatDateTime('2026-08-19T10:30:00Z')).toMatch(/2026.*\d{2}:\d{2}/)
  })
})
