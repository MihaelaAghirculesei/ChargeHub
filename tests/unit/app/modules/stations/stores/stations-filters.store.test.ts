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

  it('regressione: un campo assente dall’URL non sovrascrive con undefined il default/cookie', () => {
    // `parseFiltersFromQuery` restituisce sempre tutte le chiavi (undefined
    // per quelle assenti) — uno spread diretto nello store cancellerebbe
    // radiusKm/latitude/longitude ogni volta che l'URL non li contiene.
    const store = useStationsFiltersStore()

    expect(store.filters.latitude).toBe(52.42)
    expect(store.filters.longitude).toBe(10.79)
    expect(store.filters.radiusKm).toBe(25)
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

  it('hover imposta e azzera la stazione in hover, indipendente dalla selezione', () => {
    const store = useStationsFiltersStore()

    store.select(101)
    store.hover(202)

    expect(store.hoveredStationId).toBe(202)
    expect(store.selectedStationId).toBe(101)

    store.hover(null)
    expect(store.hoveredStationId).toBeNull()
    expect(store.selectedStationId).toBe(101)
  })

  it('parte con viewMode "split" di default', () => {
    const store = useStationsFiltersStore()

    expect(store.viewMode).toBe('split')
  })

  it('setViewMode cambia la modalità', () => {
    const store = useStationsFiltersStore()

    store.setViewMode('map')

    expect(store.viewMode).toBe('map')
  })

  it('sposta la mappa (lat/lon/radius) aggiorna anche la query URL', async () => {
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
