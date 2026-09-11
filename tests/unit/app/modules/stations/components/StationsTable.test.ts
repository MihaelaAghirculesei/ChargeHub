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
   * within the current map view, or the free-text search names a place
   * that view does not currently show — NL search deliberately never
   * geocodes free text and never moves the map (ADR-0007), and neither
   * does the classic text filter, so the client cannot tell the two cases
   * apart. Naming a fixed region here would be wrong the moment someone
   * pans the map elsewhere (a real regression this session: the hint used
   * to name "Wolfsburg/Braunschweig/Gifhorn", which broke as soon as the
   * map was panned to Dresden) — the empty state explains the actual
   * mechanism instead, which stays true regardless of where the map is.
   */
  it('explains that the search only filters the current map view, not just a generic "no results"', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations', () => ({ items: [], total: 0 }))

    const wrapper = await mountSuspended(StationsTable)
    await flushPromises()

    const empty = wrapper.find('[data-testid="stations-empty"]')
    expect(empty.exists()).toBe(true)
    expect(empty.text()).toContain('Gebiets, das die Karte gerade zeigt')
  })
})
