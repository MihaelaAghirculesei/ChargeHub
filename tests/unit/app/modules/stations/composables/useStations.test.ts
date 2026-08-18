import { clearNuxtData } from '#app'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { useStations } from '~/modules/stations/composables/useStations'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

/**
 * `useAsyncData` (dentro `useStations`) richiede un contesto app Nuxt vero
 * per funzionare — non si può chiamare la funzione da sola in un test come
 * fosse una funzione pura. `mountSuspended` monta questo host minimo dentro
 * l'ambiente vitest "nuxt" ed espone il risultato del composable su `.vm`.
 */
const StationsHost = defineComponent({
  setup() {
    return useStations()
  },
  template: '<div />'
})

// L'ambiente "nuxt" riusa una singola app (e quindi un singolo Pinia) per
// tutto il file di test, non una per `it()`: senza pulizia, `registerEndpoint`
// accumula handler (quello del test precedente resta il primo match) e la
// cache di `useAsyncData` servirebbe il valore già risolto invece di
// rifare la richiesta al mount successivo.
let unregisterEndpoint: (() => void) | undefined
afterEach(() => {
  unregisterEndpoint?.()
  unregisterEndpoint = undefined
  clearNuxtData('stations-list')
  useStationsFiltersStore().resetFilters()
})

describe('useStations', () => {
  it('espone le stazioni e il totale della pagina corrente dopo il fetch iniziale', async () => {
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

  it('updateOptions traduce il payload di v-data-table-server nello stato tabella dei filtri', async () => {
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

  it('con sortBy vuoto (colonna deselezionata) azzera sortBy/sortOrder invece di lasciare il vecchio valore', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations', () => ({ items: [], total: 0 }))

    const wrapper = await mountSuspended(StationsHost)
    await flushPromises()
    wrapper.vm.updateOptions({ page: 1, itemsPerPage: 10, sortBy: [{ key: 'name', order: 'asc' }] })
    wrapper.vm.updateOptions({ page: 1, itemsPerPage: 10, sortBy: [] })

    expect(useStationsFiltersStore().tableOptions.sortBy).toBeUndefined()
    expect(useStationsFiltersStore().tableOptions.sortOrder).toBeUndefined()
  })
})
