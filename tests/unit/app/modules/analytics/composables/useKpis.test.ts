import { clearNuxtData } from '#app'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { useKpis } from '~/modules/analytics/composables/useKpis'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

/** Stesso pattern di useStations.test.ts: useAsyncData richiede un contesto app Nuxt vero. */
const KpisHost = defineComponent({
  setup() {
    return useKpis()
  },
  template: '<div />'
})

let unregisterEndpoint: (() => void) | undefined
afterEach(() => {
  unregisterEndpoint?.()
  unregisterEndpoint = undefined
  clearNuxtData('dashboard-kpis')
  useStationsFiltersStore().resetFilters()
})

describe('useKpis', () => {
  it('espone i KPI dopo il fetch iniziale', async () => {
    unregisterEndpoint = registerEndpoint('/api/kpi', () => [
      { key: 'stations', value: 42, unit: '', trendPercent: 0, higherIsBetter: true, series: [] }
    ])

    const wrapper = await mountSuspended(KpisHost)
    await flushPromises()

    expect(wrapper.vm.kpis).toEqual([
      { key: 'stations', value: 42, unit: '', trendPercent: 0, higherIsBetter: true, series: [] }
    ])
    expect(wrapper.vm.pending).toBe(false)
    expect(wrapper.vm.error).toBeFalsy()
  })

  it('espone un array vuoto (non undefined) prima che il fetch risolva o se il payload è vuoto', async () => {
    unregisterEndpoint = registerEndpoint('/api/kpi', () => [])

    const wrapper = await mountSuspended(KpisHost)
    await flushPromises()

    expect(wrapper.vm.kpis).toEqual([])
  })
})
