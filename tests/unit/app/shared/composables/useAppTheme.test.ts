import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { useAppTheme } from '~/shared/composables/useAppTheme'

/**
 * `useTheme()` (Vuetify) richiede il plugin registrato su un'app vera.
 * La persistenza su cookie non è testata qui: `useCookie` è lo stesso
 * meccanismo già usato (e testato dove conta di più) per i filtri stazioni
 * dal Giorno 4 — non è logica di questo composable, solo un dettaglio di
 * `useCookie` di Nuxt stesso.
 */
const ThemeHost = defineComponent({
  setup() {
    return useAppTheme()
  },
  template: '<div />'
})

describe('useAppTheme', () => {
  it('isDark riflette il tema Vuetify attivo', async () => {
    const wrapper = await mountSuspended(ThemeHost)

    wrapper.vm.setTheme('dark')
    expect(wrapper.vm.isDark).toBe(true)

    wrapper.vm.setTheme('light')
    expect(wrapper.vm.isDark).toBe(false)
  })

  it('toggleTheme passa da chiaro a scuro e viceversa', async () => {
    const wrapper = await mountSuspended(ThemeHost)
    wrapper.vm.setTheme('light')

    wrapper.vm.toggleTheme()
    expect(wrapper.vm.isDark).toBe(true)

    wrapper.vm.toggleTheme()
    expect(wrapper.vm.isDark).toBe(false)
  })
})
