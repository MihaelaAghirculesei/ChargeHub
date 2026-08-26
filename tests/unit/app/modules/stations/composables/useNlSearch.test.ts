import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { useNlSearch } from '~/modules/stations/composables/useNlSearch'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

/** Stesso pattern di useStations.test.ts: useNlSearch usa lo store filtri, che tocca useRoute/useRouter — serve un vero contesto app. */
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
  it('applica allo store i soli campi estratti non nulli', async () => {
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
    // I campi restituiti null non vengono scritti: restano al default dello store.
    expect(filters.operatorId).toBeUndefined()
    expect(filters.statusTypeId).toBeUndefined()
    expect(wrapper.vm.error).toBeNull()
    expect(wrapper.vm.pending).toBe(false)
  })

  it('somma i criteri estratti ai filtri già attivi: i campi non citati dalla query restano intatti', async () => {
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
    // Impostati "a mano" nella barra filtri classica prima della ricerca NL.
    store.setFilters({ minPowerKw: 50, statusTypeId: 3 })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('stazioni Ionity')
    await flushPromises()

    const filters = store.filters
    expect(filters.operatorId).toBe(10) // estratto dalla query
    expect(filters.minPowerKw).toBe(50) // non citato: preservato, non azzerato
    expect(filters.statusTypeId).toBe(3) // non citato: preservato
    expect(wrapper.vm.error).toBeNull()
  })

  it('ignora un secondo search() mentre il primo è ancora in volo (niente doppia POST)', async () => {
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
    // Nessun await sulla prima: la seconda parte mentre `pending` è già true.
    const first = wrapper.vm.search('query uno')
    const second = wrapper.vm.search('query due')
    await Promise.all([first, second])
    await flushPromises()

    expect(calls).toBe(1)
  })

  it("una query vuota non chiama l'endpoint", async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw new Error('non doveva essere chiamato')
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('   ')
    await flushPromises()

    expect(wrapper.vm.error).toBeNull()
  })

  it("null (v-model del campo clearable dopo un click sulla X) non chiama l'endpoint e non esplode", async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw new Error('non doveva essere chiamato')
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search(null)
    await flushPromises()

    expect(wrapper.vm.error).toBeNull()
  })

  it('un 429 senza code diventa rate_limited', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw createError({ statusCode: 429, statusMessage: 'Troppe ricerche.' })
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('query qualunque')
    await flushPromises()

    expect(wrapper.vm.error).toBe('rate_limited')
  })

  it('un 429 con data.code daily_cap diventa daily_cap, non rate_limited', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw createError({
          statusCode: 429,
          statusMessage: 'Limite giornaliero.',
          data: { code: 'daily_cap' }
        })
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('query qualunque')
    await flushPromises()

    expect(wrapper.vm.error).toBe('daily_cap')
  })

  it('un 503 diventa not_configured', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw createError({ statusCode: 503, statusMessage: 'Non configurato.' })
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('query qualunque')
    await flushPromises()

    expect(wrapper.vm.error).toBe('not_configured')
  })

  it('un errore generico diventa failed', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/nl-search', {
      method: 'POST',
      handler: () => {
        throw createError({ statusCode: 500, statusMessage: 'Boom.' })
      }
    })

    const wrapper = await mountSuspended(NlSearchHost)
    await wrapper.vm.search('query qualunque')
    await flushPromises()

    expect(wrapper.vm.error).toBe('failed')
  })
})
