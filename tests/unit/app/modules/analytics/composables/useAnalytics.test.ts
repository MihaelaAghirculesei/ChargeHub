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
 * `period` passato come `ref` diretto, non come prop dell'host — stesso
 * modo in cui lo chiama davvero `app/pages/analytics/index.vue` (il
 * selettore 7/30/90 giorni è un `ref`, non un valore derivato da props).
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
  it('espone i dati dei grafici dopo il fetch iniziale', async () => {
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

  it('rifetcha quando il periodo cambia', async () => {
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
