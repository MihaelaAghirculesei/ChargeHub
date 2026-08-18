import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

// L'ambiente "nuxt" riusa un singolo router (e un singolo Pinia, resettato
// sotto) per tutto il file: senza pulizia, i query param impostati da un
// test rimarrebbero nell'URL del test successivo.
afterEach(async () => {
  const router = useRouter()
  await router.replace({ query: {} })
})

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useStationsFiltersStore', () => {
  it('parte con i filtri e lo stato tabella di default, nessuna selezione', () => {
    const store = useStationsFiltersStore()

    expect(store.filters).toMatchObject({ countryCode: 'DE', radiusKm: 25, maxResults: 100 })
    expect(store.tableOptions).toEqual({ page: 1, itemsPerPage: 10 })
    expect(store.selectedStationId).toBeNull()
  })

  it('al caricamento legge i filtri dalla query URL, se presente', async () => {
    const router = useRouter()
    await router.replace({ query: { search: 'Rathaus', minpowerkw: '22' } })

    const store = useStationsFiltersStore()

    expect(store.filters.search).toBe('Rathaus')
    expect(store.filters.minPowerKw).toBe(22)
  })

  it('setFilters fa merge parziale senza toccare i campi non passati', () => {
    const store = useStationsFiltersStore()

    store.setFilters({ minPowerKw: 22 })

    expect(store.filters.minPowerKw).toBe(22)
    expect(store.filters.countryCode).toBe('DE')
  })

  it('setFilters aggiorna anche i query param della route (URL condivisibile)', async () => {
    const store = useStationsFiltersStore()

    store.setFilters({ search: 'Stadtwerke', operatorId: 5 })
    await nextTick()
    await flushPromises()

    const route = useRoute()
    expect(route.query.search).toBe('Stadtwerke')
    expect(route.query.operatorid).toBe('5')
  })

  it('setFilters riporta la tabella a pagina 1', () => {
    const store = useStationsFiltersStore()

    store.setTableOptions({ page: 3 })
    store.setFilters({ minPowerKw: 22 })

    expect(store.tableOptions.page).toBe(1)
  })

  it('resetFilters riporta filtri e tabella ai default', () => {
    const store = useStationsFiltersStore()

    store.setFilters({ minPowerKw: 22, operatorId: 5 })
    store.setTableOptions({ page: 4, sortBy: 'name', sortOrder: 'desc' })
    store.resetFilters()

    expect(store.filters.minPowerKw).toBeUndefined()
    expect(store.filters.operatorId).toBeUndefined()
    expect(store.tableOptions).toEqual({ page: 1, itemsPerPage: 10 })
  })

  it('setTableOptions fa merge parziale', () => {
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

  it('select imposta e azzera la stazione selezionata', () => {
    const store = useStationsFiltersStore()

    store.select(101)
    expect(store.selectedStationId).toBe(101)

    store.select(null)
    expect(store.selectedStationId).toBeNull()
  })
})
