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
 *
 * `pending` esposto qui non è il `pending` grezzo di `useAsyncData`: con
 * `server: false` il fetch non parte mai lato server, quindi l'HTML SSR
 * viene generato con `pending === false` — ma lato client Nuxt lo pianifica
 * in `onBeforeMount` (per non bloccare il primo render), che scatta
 * *prima* del confronto di idratazione di Vue. Il risultato: al momento
 * dell'idratazione `pending` è già `true`, mentre l'HTML ricevuto dal
 * server riflette ancora `false` — un mismatch di idratazione reale
 * (`v-data-table--loading` presente/assente), trovato con un warning Vue
 * in console, non a occhio. `hydrated` (falso finché `onMounted` non
 * scatta, cioè dopo che l'idratazione è già completata) tiene `pending`
 * forzato a `false` per il primissimo render — identico a quanto l'HTML
 * SSR ha già mostrato — e lascia che rifletta lo stato reale solo da lì in
 * poi, quando un aggiornamento reattivo post-mount non è più un confronto
 * di idratazione.
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

  const {
    data,
    pending: rawPending,
    error,
    refresh
  } = useAsyncData('sessions-list', () => sessionRepository.list(pool.value), {
    watch: [pool],
    server: false
  })

  const hydrated = ref(false)
  onMounted(() => {
    hydrated.value = true
  })

  const sessions = computed(() => data.value ?? [])
  const pending = computed(() => hydrated.value && rawPending.value)

  return { sessions, pending, error, refresh }
}
