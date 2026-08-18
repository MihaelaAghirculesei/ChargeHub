import type { StationFilters } from '~/modules/stations/types'

const FILTERS_COOKIE_NAME = 'chargehub-station-filters'

/**
 * Wolfsburg come default: nessuna geolocalizzazione/ricerca città ancora
 * costruita (arriva con la mappa, Giorno 7), quindi serve un centro di
 * ricerca sensato piuttosto che coordinate 0,0. Stessi valori dell'esempio
 * verificato end-to-end al Giorno 3.
 */
function defaultFilters(): StationFilters {
  return {
    latitude: 52.42,
    longitude: 10.79,
    radiusKm: 25,
    countryCode: 'DE',
    maxResults: 50
  }
}

function useFiltersCookie() {
  return useCookie<StationFilters>(FILTERS_COOKIE_NAME, {
    default: defaultFilters,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
}

/**
 * Stato di *UI*: filtri attivi e stazione selezionata. Persistiamo solo i
 * filtri (via cookie, leggibile anche in SSR) — mai la lista delle stazioni,
 * che è dominio e va sempre rifetchata (vedi `useStationsStore`).
 */
export const useStationsFiltersStore = defineStore('stations-filters', () => {
  const filtersCookie = useFiltersCookie()
  const filters = ref<StationFilters>(filtersCookie.value)
  const selectedStationId = ref<number | null>(null)

  watch(
    filters,
    (value) => {
      filtersCookie.value = value
    },
    { deep: true }
  )

  function setFilters(patch: Partial<StationFilters>) {
    filters.value = { ...filters.value, ...patch }
  }

  function resetFilters() {
    filters.value = defaultFilters()
  }

  function select(id: number | null) {
    selectedStationId.value = id
  }

  return { filters, selectedStationId, setFilters, resetFilters, select }
})
