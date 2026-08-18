import { filtersToQuery, parseFiltersFromQuery } from '~/modules/stations/filters-url'
import type {
  StationFilters,
  StationsTableOptions,
  StationsViewMode
} from '~/modules/stations/types'

const FILTERS_COOKIE_NAME = 'chargehub-station-filters'
const VIEW_MODE_COOKIE_NAME = 'chargehub-station-view-mode'

/**
 * Wolfsburg come default: nessuna geolocalizzazione ancora costruita al
 * primo avvio, quindi serve un centro di ricerca sensato piuttosto che
 * coordinate 0,0 — da qui in poi (Giorno 8) la mappa stessa aggiorna
 * `latitude`/`longitude`/`radiusKm` quando l'utente la sposta. `maxResults:
 * 100` (tetto di OCM) perché è "quanti risultati tenere cachati per
 * paginarci sopra", non più "quanti mostrarne" — vedi `itemsPerPage` in
 * `StationsTableOptions`.
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
 * `parseFiltersFromQuery` restituisce sempre tutte le chiavi (`undefined`
 * per quelle assenti dall'URL) — utile per i test, ma qui servono solo i
 * campi *presenti* nell'URL: uno spread diretto sovrascriverebbe con
 * `undefined` i valori validi del cookie (es. `radiusKm`) ogni volta che
 * l'URL non li contiene, il che è quasi sempre.
 */
function withoutUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>
}

/** Cookie separato dai filtri apposta: è una preferenza di UI, non un criterio di ricerca. */
function useViewModeCookie() {
  return useCookie<StationsViewMode>(VIEW_MODE_COOKIE_NAME, {
    default: () => 'split',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
}

/**
 * Stato di *UI*: filtri di ricerca, stato della tabella (pagina/ordinamento),
 * modalità di visualizzazione mappa/lista, stazione selezionata e stazione
 * in hover. Persistiamo filtri e modalità di visualizzazione (via cookie,
 * leggibile anche in SSR) — non la pagina/ordinamento correnti (resettare
 * la vista tabella ad ogni sessione è il comportamento giusto, non un
 * difetto) e mai la lista delle stazioni, che è dominio e va sempre
 * rifetchata (vedi `useStationsStore`).
 *
 * I filtri condivisibili (barra filtri del Giorno 6 + area di ricerca della
 * mappa del Giorno 8: `latitude`/`longitude`/`radiusKm`/`search`/...)
 * sincronizzano anche con i query param dell'URL, così una ricerca è
 * condivisibile via link — quelli hanno priorità sul cookie al primo
 * caricamento (un link condiviso deve ricostruire la vista di chi lo apre,
 * non quella salvata nel suo browser). La sync è a senso unico (le nostre
 * modifiche scrivono su URL+cookie): non c'è un watcher che legga l'URL
 * dopo il mount, per evitare un ping-pong reattivo URL→filtri→URL. Vuol
 * dire che avanti/indietro del browser non naviga la cronologia dei filtri
 * all'interno della pagina — solo un refresh o un nuovo caricamento la
 * rilegge, che è esattamente il criterio "Fatto quando" del piano (copi
 * l'URL, lo apri altrove, stessa vista).
 */
export const useStationsFiltersStore = defineStore('stations-filters', () => {
  const route = useRoute()
  const router = useRouter()
  const filtersCookie = useFiltersCookie()
  const viewModeCookie = useViewModeCookie()

  const filters = ref<StationFilters>({
    ...filtersCookie.value,
    ...withoutUndefined(parseFiltersFromQuery(route.query))
  })
  const tableOptions = ref<StationsTableOptions>(defaultTableOptions())
  const viewMode = ref<StationsViewMode>(viewModeCookie.value)
  const selectedStationId = ref<number | null>(null)
  /** Stazione sotto il puntatore (riga della tabella o marker della mappa) — evidenziazione transitoria, non selezione. */
  const hoveredStationId = ref<number | null>(null)

  watch(
    filters,
    (value) => {
      filtersCookie.value = value
      router.replace({ query: { ...route.query, ...filtersToQuery(value) } })
    },
    { deep: true }
  )

  watch(viewMode, (value) => {
    viewModeCookie.value = value
  })

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

  function setViewMode(mode: StationsViewMode) {
    viewMode.value = mode
  }

  function select(id: number | null) {
    selectedStationId.value = id
  }

  function hover(id: number | null) {
    hoveredStationId.value = id
  }

  return {
    filters,
    tableOptions,
    viewMode,
    selectedStationId,
    hoveredStationId,
    setFilters,
    resetFilters,
    setTableOptions,
    setViewMode,
    select,
    hover
  }
})
