import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { useLocaleFormatters } from '~/shared/composables/useLocaleFormatters'

/**
 * `useI18n()` (dentro `useLocaleFormatters`) richiede il plugin i18n
 * registrato su un'app Nuxt vera — stesso motivo/pattern di
 * useStations.test.ts per `useAsyncData`. Il locale di default
 * dell'ambiente di test è `de` (`detectBrowserLanguage: false`, Giorno 17),
 * quindi ogni assert qui sotto assume `de-DE`.
 */
const FormattersHost = defineComponent({
  setup() {
    return useLocaleFormatters()
  },
  template: '<div />'
})

describe('useLocaleFormatters', () => {
  it('tag risolve al BCP-47 del locale attivo (de-DE, default in questo ambiente)', async () => {
    const wrapper = await mountSuspended(FormattersHost)
    expect(wrapper.vm.tag).toBe('de-DE')
  })

  it('formatNumber usa la virgola come separatore decimale in tedesco', async () => {
    const wrapper = await mountSuspended(FormattersHost)
    expect(wrapper.vm.formatNumber(1234.5)).toBe('1.234,5')
  })

  it('formatCurrency resta sempre in EUR, formattato secondo il locale', async () => {
    const wrapper = await mountSuspended(FormattersHost)
    // Nessun match sullo spazio esatto tra numero e simbolo: `Intl` in
    // tedesco usa uno spazio non interrompibile (dipende dalla versione
    // ICU), non uno spazio normale — \s lo copre in ogni caso.
    expect(wrapper.vm.formatCurrency(12.5)).toMatch(/^12,50\s€$/)
  })

  it('formatDate rispetta le options passate', async () => {
    const wrapper = await mountSuspended(FormattersHost)
    expect(
      wrapper.vm.formatDate('2026-08-19', { year: 'numeric', month: '2-digit', day: '2-digit' })
    ).toBe('19.08.2026')
  })

  it('formatDateTime ha un default sensato (dateStyle medium, timeStyle short)', async () => {
    const wrapper = await mountSuspended(FormattersHost)
    // Non un valore esatto (dipende dal fuso orario di CI): solo che
    // contenga sia la data che un orario nel formato tedesco (HH:MM).
    expect(wrapper.vm.formatDateTime('2026-08-19T10:30:00Z')).toMatch(/2026.*\d{2}:\d{2}/)
  })
})
