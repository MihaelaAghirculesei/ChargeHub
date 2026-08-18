import { useStationsFiltersStore } from '~/modules/stations'
import { sessionRepository } from '~/modules/sessions/repository'

/**
 * Riusa l'area di ricerca già attiva per le stazioni (stesso store del
 * Giorno 4) come pool da cui generare le sessioni sintetiche: "le sessioni
 * delle stazioni che stai già guardando", non un'area di ricerca
 * indipendente. Si osservano solo i campi geografici del pool, non l'intero
 * store — cambiare la ricerca testuale delle stazioni (che non tocca il
 * pool) non deve far ripartire il fetch delle sessioni.
 *
 * `server: false`: le ~2000 righe misurano circa 600KB di JSON — inutile
 * gonfiare l'HTML/payload SSR di ogni caricamento con dati che servono solo
 * alla tabella virtualizzata lato client, senza alcun valore SEO/condivisione
 * a differenza del dettaglio stazione (Giorno 9). Il fetch parte dopo
 * l'hydration, `pending` guida lo stato di caricamento della tabella.
 */
export function useSessions() {
  const stationsFiltersStore = useStationsFiltersStore()

  const pool = computed(() => ({
    latitude: stationsFiltersStore.filters.latitude,
    longitude: stationsFiltersStore.filters.longitude,
    radiusKm: stationsFiltersStore.filters.radiusKm,
    countryCode: stationsFiltersStore.filters.countryCode,
    maxResults: stationsFiltersStore.filters.maxResults
  }))

  const { data, pending, error, refresh } = useAsyncData(
    'sessions-list',
    () => sessionRepository.list(pool.value),
    { watch: [pool], server: false }
  )

  const sessions = computed(() => data.value ?? [])

  return { sessions, pending, error, refresh }
}
