import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

// The "nuxt" env reuses a single router (and a single Pinia, reset below)
// for the whole file: without cleanup, the query params set by one test
// would remain in the next test's URL.
afterEach(async () => {
  const router = useRouter()
  await router.replace({ query: {} })
})

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useStationsFiltersStore', () => {
  it('starts with the default filters and table state, no selection', () => {
    const store = useStationsFiltersStore()

    expect(store.filters).toMatchObject({ countryCode: 'DE', radiusKm: 25, maxResults: 100 })
    expect(store.tableOptions).toEqual({ page: 1, itemsPerPage: 10 })
    expect(store.selectedStationId).toBeNull()
  })

  it('on load it reads the filters from the URL query, if present', async () => {
    const router = useRouter()
    await router.replace({ query: { search: 'Rathaus', minpowerkw: '22' } })

    const store = useStationsFiltersStore()

    expect(store.filters.search).toBe('Rathaus')
    expect(store.filters.minPowerKw).toBe(22)
  })

  it('regression: a field absent from the URL does not overwrite the default/cookie with undefined', () => {
    // `parseFiltersFromQuery` always returns every key (undefined for the
    // absent ones) — a direct spread into the store would erase
    // radiusKm/latitude/longitude every time the URL does not contain them.
    const store = useStationsFiltersStore()

    expect(store.filters.latitude).toBe(52.42)
    expect(store.filters.longitude).toBe(10.79)
    expect(store.filters.radiusKm).toBe(25)
  })

  it('setFilters does a partial merge without touching the fields not passed', () => {
    const store = useStationsFiltersStore()

    store.setFilters({ minPowerKw: 22 })

    expect(store.filters.minPowerKw).toBe(22)
    expect(store.filters.countryCode).toBe('DE')
  })

  it('setFilters also updates the route query params (shareable URL)', async () => {
    const store = useStationsFiltersStore()

    store.setFilters({ search: 'Stadtwerke', operatorId: 5 })
    await nextTick()
    await flushPromises()

    const route = useRoute()
    expect(route.query.search).toBe('Stadtwerke')
    expect(route.query.operatorid).toBe('5')
  })

  it('setFilters resets the table to page 1', () => {
    const store = useStationsFiltersStore()

    store.setTableOptions({ page: 3 })
    store.setFilters({ minPowerKw: 22 })

    expect(store.tableOptions.page).toBe(1)
  })

  it('resetFilters restores filters and table to the defaults', () => {
    const store = useStationsFiltersStore()

    store.setFilters({ minPowerKw: 22, operatorId: 5 })
    store.setTableOptions({ page: 4, sortBy: 'name', sortOrder: 'desc' })
    store.resetFilters()

    expect(store.filters.minPowerKw).toBeUndefined()
    expect(store.filters.operatorId).toBeUndefined()
    expect(store.tableOptions).toEqual({ page: 1, itemsPerPage: 10 })
  })

  it('setTableOptions does a partial merge', () => {
    const store = useStationsFiltersStore()

    store.setTableOptions({ page: 2 })
    store.setTableOptions({ sortBy: 'operator', sortOrder: 'asc' })

    expect(store.tableOptions).toEqual({
      page: 2,
      itemsPerPage: 10,
      sortBy: 'operator',
      sortOrder: 'asc'
    })
  })

  it('select sets and clears the selected station', () => {
    const store = useStationsFiltersStore()

    store.select(101)
    expect(store.selectedStationId).toBe(101)

    store.select(null)
    expect(store.selectedStationId).toBeNull()
  })

  it('hover sets and clears the hovered station, independent of the selection', () => {
    const store = useStationsFiltersStore()

    store.select(101)
    store.hover(202)

    expect(store.hoveredStationId).toBe(202)
    expect(store.selectedStationId).toBe(101)

    store.hover(null)
    expect(store.hoveredStationId).toBeNull()
    expect(store.selectedStationId).toBe(101)
  })

  it('starts with viewMode "split" by default', () => {
    const store = useStationsFiltersStore()

    expect(store.viewMode).toBe('split')
  })

  it('setViewMode changes the mode', () => {
    const store = useStationsFiltersStore()

    store.setViewMode('map')

    expect(store.viewMode).toBe('map')
  })

  it('panning the map (lat/lon/radius) also updates the URL query', async () => {
    const store = useStationsFiltersStore()

    store.setFilters({ latitude: 48.14, longitude: 11.58, radiusKm: 10 })
    await nextTick()
    await flushPromises()

    const route = useRoute()
    expect(route.query.lat).toBe('48.14')
    expect(route.query.lon).toBe('11.58')
    expect(route.query.radius).toBe('10')
  })
})
