import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { useNlSearch } from '~/modules/stations/composables/useNlSearch'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

/** Same pattern as useStations.test.ts: useNlSearch uses the filters store, which touches useRoute/useRouter — a real app context is needed. */
const NlSearchHost = defineComponent({
  setup() {
    return useNlSearch()
  },
  template: '<div />'
})

let unregisterEndpoint: (() => void) | undefined
afterEach(() => {
  unregisterEndpoint?.()
  unregisterEndpoint = undefined
  useStationsFiltersStore().resetFilters()
})

describe('useNlSearch', () => {
  it('applies only the non-null extracted fields to the store', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => ({
        filters: {
          search: 'schnell',
          connectionTypeId: 25,
          operatorId: null,
          statusTypeId: null,
          minPowerKw: 50
        }
      })
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('CCS schnell')
    await flushPromises()

    const filters = useStationsFiltersStore().filters
    expect(filters.search).toBe('schnell')
    expect(filters.connectionTypeId).toBe(25)
    expect(filters.minPowerKw).toBe(50)
    // Fields returned as null are not written: they stay at the store default.
    expect(filters.operatorId).toBeUndefined()
    expect(filters.statusTypeId).toBeUndefined()
    expect(wrapper.vm.error).toBeNull()
    expect(wrapper.vm.pending).toBe(false)
  })

  it('merges the extracted criteria into the already-active filters: fields the query does not name stay intact', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => ({
        filters: {
          search: null,
          connectionTypeId: null,
          operatorId: 10,
          statusTypeId: null,
          minPowerKw: null
        }
      })
    })

    const store = useStationsFiltersStore()
    // Set "by hand" in the classic filter bar before the NL search.
    store.setFilters({ minPowerKw: 50, statusTypeId: 3 })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('Ionity stations')
    await flushPromises()

    const filters = store.filters
    expect(filters.operatorId).toBe(10) // extracted from the query
    expect(filters.minPowerKw).toBe(50) // not mentioned: preserved, not cleared
    expect(filters.statusTypeId).toBe(3) // not mentioned: preserved
    expect(wrapper.vm.error).toBeNull()
  })

  it('ignores a second search() while the first is still in flight (no double POST)', async () => {
    let calls = 0
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        calls += 1
        return {
          filters: {
            search: 'x',
            connectionTypeId: null,
            operatorId: null,
            statusTypeId: null,
            minPowerKw: null
          }
        }
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    // No await on the first: the second starts while `pending` is already true.
    const first = wrapper.vm.search('query one')
    const second = wrapper.vm.search('query two')
    await Promise.all([first, second])
    await flushPromises()

    expect(calls).toBe(1)
  })

  it('an empty query does not call the endpoint', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw new Error('should not have been called')
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('   ')
    await flushPromises()

    expect(wrapper.vm.error).toBeNull()
  })

  it('null (the clearable field v-model after a click on the X) does not call the endpoint and does not blow up', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw new Error('should not have been called')
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search(null)
    await flushPromises()

    expect(wrapper.vm.error).toBeNull()
  })

  it('a 429 with no code becomes rate_limited', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw createError({ statusCode: 429, statusMessage: 'Too many searches.' })
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('any query')
    await flushPromises()

    expect(wrapper.vm.error).toBe('rate_limited')
  })

  it('a 429 with data.code daily_cap becomes daily_cap, not rate_limited', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw createError({
          statusCode: 429,
          statusMessage: 'Daily limit.',
          data: { code: 'daily_cap' }
        })
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('any query')
    await flushPromises()

    expect(wrapper.vm.error).toBe('daily_cap')
  })

  it('a 503 becomes not_configured', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw createError({ statusCode: 503, statusMessage: 'Not configured.' })
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('any query')
    await flushPromises()

    expect(wrapper.vm.error).toBe('not_configured')
  })

  it('a generic error becomes failed', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw createError({ statusCode: 500, statusMessage: 'Boom.' })
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('any query')
    await flushPromises()

    expect(wrapper.vm.error).toBe('failed')
  })
})
