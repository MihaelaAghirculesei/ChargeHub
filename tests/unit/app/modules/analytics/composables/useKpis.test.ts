import { clearNuxtData } from '#app'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { useKpis } from '~/modules/analytics/composables/useKpis'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

/** Same pattern as useStations.test.ts: useAsyncData needs a real Nuxt app context. */
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
  it('exposes the KPIs after the initial fetch', async () => {
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

  it('exposes an empty array (not undefined) before the fetch resolves or if the payload is empty', async () => {
    unregisterEndpoint = registerEndpoint('/api/kpi', () => [])

    const wrapper = await mountSuspended(KpisHost)
    await flushPromises()

    expect(wrapper.vm.kpis).toEqual([])
  })
})
