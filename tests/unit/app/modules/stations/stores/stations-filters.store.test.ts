import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useStationsFiltersStore', () => {
  it('parte con i filtri di default e nessuna selezione', () => {
    const store = useStationsFiltersStore()

    expect(store.filters).toMatchObject({ countryCode: 'DE', radiusKm: 25, maxResults: 50 })
    expect(store.selectedStationId).toBeNull()
  })

  it('setFilters fa merge parziale senza toccare i campi non passati', () => {
    const store = useStationsFiltersStore()

    store.setFilters({ minPowerKw: 22 })

    expect(store.filters.minPowerKw).toBe(22)
    expect(store.filters.countryCode).toBe('DE')
  })

  it('resetFilters riporta ai default e cancella i filtri opzionali', () => {
    const store = useStationsFiltersStore()

    store.setFilters({ minPowerKw: 22, operatorId: 5 })
    store.resetFilters()

    expect(store.filters.minPowerKw).toBeUndefined()
    expect(store.filters.operatorId).toBeUndefined()
  })

  it('select imposta e azzera la stazione selezionata', () => {
    const store = useStationsFiltersStore()

    store.select(101)
    expect(store.selectedStationId).toBe(101)

    store.select(null)
    expect(store.selectedStationId).toBeNull()
  })
})
