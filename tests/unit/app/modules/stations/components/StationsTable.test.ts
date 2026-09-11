import { clearNuxtData } from '#app'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import StationsTable from '~/modules/stations/components/StationsTable.vue'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

// Same cleanup as useStations.test.ts: one Nuxt app (and cache) for the whole file.
let unregisterEndpoint: (() => void) | undefined
afterEach(() => {
  unregisterEndpoint?.()
  unregisterEndpoint = undefined
  clearNuxtData('stations-list')
  useStationsFiltersStore().resetFilters()
})

describe('StationsTable', () => {
  /**
   * Zero results looks identical whether the filters are just too strict
   * within the covered area, or the search points at a real place the demo
   * data does not cover at all (e.g. "Köln" instead of Wolfsburg /
   * Braunschweig / Gifhorn) — NL search deliberately never geocodes free
   * text (ADR-0007), so the client cannot tell the two apart. The empty
   * state names the covered area instead, so a "no results" is not read as
   * "the search is broken".
   */
  it('names the real covered area in the empty state, not just a generic "no results"', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations', () => ({ items: [], total: 0 }))

    const wrapper = await mountSuspended(StationsTable)
    await flushPromises()

    const empty = wrapper.find('[data-testid="stations-empty"]')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('Wolfsburg/Braunschweig/Gifhorn')
  })
})
