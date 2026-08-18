import type { StationFilters, StationsTableOptions } from '~/modules/stations/types'

const FILTERS_COOKIE_NAME = 'chargehub-station-filters'

/**
 * Wolfsburg come default: nessuna geolocalizzazione/ricerca città ancora
 * costruita (arriva con la mappa, Giorno 7), quindi serve un centro di
 * ricerca sensato piuttosto che coordinate 0,0. `maxResults: 100` (tetto di
 * OCM) perché ora è "quanti risultati tenere cachati per paginarci sopra",
 * non più "quanti mostrarne" — vedi `itemsPerPage` in `StationsTableOptions`.
 */
function defaultFilters(): StationFilters {
  return {
    latitude: 52.42,
    longitude: 10.79,
    radiusKm: 25,
    countryCode: 'DE',
    maxResults: 100
  }
}

function defaultTableOptions(): StationsTableOptions {
  return { page: 1, itemsPerPage: 10 }
}

function useFiltersCookie() {
  return useCookie<StationFilters>(FILTERS_COOKIE_NAME, {
    default: defaultFilters,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
}

/**
 * Stato di *UI*: filtri di ricerca, stato della tabella (pagina/ordinamento)
 * e stazione selezionata. Persistiamo solo i filtri (via cookie, leggibile
 * anche in SSR) — non la pagina/ordinamento correnti (resettare la vista
 * tabella ad ogni sessione è il comportamento giusto, non un difetto) e mai
 * la lista delle stazioni, che è dominio e va sempre rifetchata (vedi
 * `useStationsStore`).
 */
export const useStationsFiltersStore = defineStore('stations-filters', () => {
  const filtersCookie = useFiltersCookie()
  const filters = ref<StationFilters>(filtersCookie.value)
  const tableOptions = ref<StationsTableOptions>(defaultTableOptions())
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
    // Filtri diversi = risultati diversi: restare sulla pagina precedente
    // potrebbe non avere più senso (es. pagina 5 di una lista ora di 2 pagine).
    tableOptions.value = { ...tableOptions.value, page: 1 }
  }

  function resetFilters() {
    filters.value = defaultFilters()
    tableOptions.value = defaultTableOptions()
  }

  function setTableOptions(patch: Partial<StationsTableOptions>) {
    tableOptions.value = { ...tableOptions.value, ...patch }
  }

  function select(id: number | null) {
    selectedStationId.value = id
  }

  return {
    filters,
    tableOptions,
    selectedStationId,
    setFilters,
    resetFilters,
    setTableOptions,
    select
  }
})
