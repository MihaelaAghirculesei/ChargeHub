import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { useAppTheme } from '~/shared/composables/useAppTheme'

/**
 * `useTheme()` (Vuetify) needs the plugin registered on a real app. Cookie
 * persistence is not tested here: `useCookie` is the same mechanism
 * already used (and tested where it matters most) for the station filters
 * since day 4 — it is not this composable's logic, only a detail of Nuxt's
 * own `useCookie`.
 */
const ThemeHost = defineComponent({
  setup() {
    return useAppTheme()
  },
  template: '<div />'
})

describe('useAppTheme', () => {
  it('isDark reflects the active Vuetify theme', async () => {
    const wrapper = await mountSuspended(ThemeHost)

    wrapper.vm.setTheme('dark')
    expect(wrapper.vm.isDark).toBe(true)

    wrapper.vm.setTheme('light')
    expect(wrapper.vm.isDark).toBe(false)
  })

  it('toggleTheme switches from light to dark and back', async () => {
    const wrapper = await mountSuspended(ThemeHost)
    wrapper.vm.setTheme('light')

    wrapper.vm.toggleTheme()
    expect(wrapper.vm.isDark).toBe(true)

    wrapper.vm.toggleTheme()
    expect(wrapper.vm.isDark).toBe(false)
  })
})
