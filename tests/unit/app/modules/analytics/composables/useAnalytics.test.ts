import { clearNuxtData } from '#app'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { getQuery } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import type { AnalyticsPeriodDays } from '~/modules/analytics/composables/useAnalytics'
import { useAnalytics } from '~/modules/analytics/composables/useAnalytics'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

/**
 * `period` passed as a direct `ref`, not as a host prop — the same way
 * `app/pages/analytics/index.vue` actually calls it (the 7/30/90-day
 * selector is a `ref`, not a value derived from props).
 */
const period = ref<AnalyticsPeriodDays>(7)
const AnalyticsHost = defineComponent({
  setup() {
    return useAnalytics(period)
  },
  template: '<div />'
})

let unregisterEndpoint: (() => void) | undefined
afterEach(() => {
  unregisterEndpoint?.()
  unregisterEndpoint = undefined
  clearNuxtData('analytics-charts')
  useStationsFiltersStore().resetFilters()
  period.value = 7
})

describe('useAnalytics', () => {
  it('exposes the chart data after the initial fetch', async () => {
    unregisterEndpoint = registerEndpoint('/api/analytics', () => ({
      energyByDay: [{ date: '2026-08-01', energyKwh: 12.5 }],
      statusDistribution: [],
      utilizationByHour: []
    }))

    const wrapper = await mountSuspended(AnalyticsHost)
    await flushPromises()

    expect(wrapper.vm.analytics).toEqual({
      energyByDay: [{ date: '2026-08-01', energyKwh: 12.5 }],
      statusDistribution: [],
      utilizationByHour: []
    })
    expect(wrapper.vm.pending).toBe(false)
    expect(wrapper.vm.error).toBeFalsy()
  })

  it('re-fetches when the period changes', async () => {
    let lastPeriod: unknown
    unregisterEndpoint = registerEndpoint('/api/analytics', (event) => {
      lastPeriod = getQuery(event).period
      return { energyByDay: [], statusDistribution: [], utilizationByHour: [] }
    })

    await mountSuspended(AnalyticsHost)
    await flushPromises()
    expect(lastPeriod).toBe('7')

    period.value = 30
    await nextTick()
    await flushPromises()

    expect(lastPeriod).toBe('30')
  })
})
