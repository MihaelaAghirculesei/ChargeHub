import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import StationsActiveFilterChips from '~/modules/stations/components/StationsActiveFilterChips.vue'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

// Stessa insidia del composable useStations: l'ambiente "nuxt" riusa una
// singola app per tutto il file, quindi endpoint/cache/store vanno puliti
// tra un test e l'altro (vedi tests/unit/app/modules/stations/composables/useStations.test.ts).
let unregisterEndpoint: (() => void) | undefined
afterEach(() => {
  unregisterEndpoint?.()
  unregisterEndpoint = undefined
  useStationsFiltersStore().resetFilters()
})

function registerReferenceData() {
  unregisterEndpoint = registerEndpoint('/api/reference-data', () => ({
    connectionTypes: [{ id: 25, title: 'Type 2 (Socket Only)' }],
    operators: [{ id: 5, title: 'Enel X' }],
    statusTypes: [{ id: 50, title: 'Operational', isOperational: true }]
  }))
}

describe('StationsActiveFilterChips', () => {
  it('non mostra nulla quando nessun filtro è attivo', async () => {
    registerReferenceData()
    const wrapper = await mountSuspended(StationsActiveFilterChips)
    await flushPromises()

    expect(wrapper.find('[data-testid="active-filter-chips"]').exists()).toBe(false)
  })

  it('mostra un chip per ogni filtro attivo, risolvendo gli ID in titoli leggibili', async () => {
    registerReferenceData()
    const filtersStore = useStationsFiltersStore()
    filtersStore.setFilters({ search: 'Rathaus', connectionTypeId: 25, minPowerKw: 22 })

    const wrapper = await mountSuspended(StationsActiveFilterChips)
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Suche: Rathaus')
    expect(text).toContain('Type 2 (Socket Only)')
    expect(text).toContain('≥ 22 kW')
  })

  it('"Alle löschen" azzera tutti i filtri', async () => {
    registerReferenceData()
    const filtersStore = useStationsFiltersStore()
    filtersStore.setFilters({ search: 'Rathaus', minPowerKw: 22 })

    const wrapper = await mountSuspended(StationsActiveFilterChips)
    await flushPromises()
    await wrapper.find('[data-testid="clear-all-filters"]').trigger('click')

    expect(filtersStore.filters.search).toBeUndefined()
    expect(filtersStore.filters.minPowerKw).toBeUndefined()
  })
})
