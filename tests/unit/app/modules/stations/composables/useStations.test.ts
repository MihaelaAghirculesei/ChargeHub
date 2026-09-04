import { clearNuxtData } from '#app'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useStations } from '~/modules/stations/composables/useStations'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

/**
 * `useAsyncData` (inside `useStations`) needs a real Nuxt app context to
 * work — you cannot call the function on its own in a test as if it were a
 * pure function. `mountSuspended` mounts this minimal host inside the
 * vitest "nuxt" environment and exposes the composable's result on `.vm`.
 */
const StationsHost = defineComponent({
  setup() {
    return useStations()
  },
  template: '<div />'
})

// The "nuxt" env reuses a single app (and so a single Pinia) for the
// whole test file, not one per `it()`: without cleanup, `registerEndpoint`
// accumulates handlers (the previous test's stays the first match) and the
// `useAsyncData` cache would serve the already-resolved value instead of
// re-issuing the request on the next mount.
let unregisterEndpoint: (() => void) | undefined
afterEach(() => {
  unregisterEndpoint?.()
  unregisterEndpoint = undefined
  clearNuxtData('stations-list')
  useStationsFiltersStore().resetFilters()
})

describe('useStations', () => {
  it('exposes the stations and the current page total after the initial fetch', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations', () => ({
      items: [{ id: 1, name: 'Rathaus' }],
      total: 42
    }))

    const wrapper = await mountSuspended(StationsHost)
    await flushPromises()

    expect(wrapper.vm.stations).toEqual([{ id: 1, name: 'Rathaus' }])
    expect(wrapper.vm.total).toBe(42)
    expect(wrapper.vm.pending).toBe(false)
    expect(wrapper.vm.error).toBeFalsy()
  })

  it('updateOptions translates the v-data-table-server payload into the table state of the filters store', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations', () => ({ items: [], total: 0 }))

    const wrapper = await mountSuspended(StationsHost)
    await flushPromises()
    wrapper.vm.updateOptions({
      page: 2,
      itemsPerPage: 25,
      sortBy: [{ key: 'name', order: 'desc' }]
    })

    expect(useStationsFiltersStore().tableOptions).toEqual({
      page: 2,
      itemsPerPage: 25,
      sortBy: 'name',
      sortOrder: 'desc'
    })
  })

  it('re-fetches when the table sort or a filter changes (not only on the initial load)', async () => {
    const handler = vi.fn(() => ({ items: [], total: 0 }))
    unregisterEndpoint = registerEndpoint('/api/stations', handler)

    const wrapper = await mountSuspended(StationsHost)
    await flushPromises()
    const callsAfterInitialLoad = handler.mock.calls.length

    // Sort change (the v-data-table-server header click path).
    wrapper.vm.updateOptions({
      page: 1,
      itemsPerPage: 10,
      sortBy: [{ key: 'operator', order: 'asc' }]
    })
    await flushPromises()
    expect(handler.mock.calls.length).toBe(callsAfterInitialLoad + 1)

    // Filter change (the filter bar path).
    useStationsFiltersStore().setFilters({ minPowerKw: 50 })
    await flushPromises()
    expect(handler.mock.calls.length).toBe(callsAfterInitialLoad + 2)
  })

  it('with an empty sortBy (column deselected) it clears sortBy/sortOrder instead of leaving the old value', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations', () => ({ items: [], total: 0 }))

    const wrapper = await mountSuspended(StationsHost)
    await flushPromises()
    wrapper.vm.updateOptions({ page: 1, itemsPerPage: 10, sortBy: [{ key: 'name', order: 'asc' }] })
    wrapper.vm.updateOptions({ page: 1, itemsPerPage: 10, sortBy: [] })

    expect(useStationsFiltersStore().tableOptions.sortBy).toBeUndefined()
    expect(useStationsFiltersStore().tableOptions.sortOrder).toBeUndefined()
  })
})
