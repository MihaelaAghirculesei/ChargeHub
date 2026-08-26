import { FetchError } from 'ofetch'
import { stationRepository } from '~/modules/stations/repository'
import { useStationsFiltersStore } from '~/modules/stations/stores/stations-filters.store'
import type { StationFilters } from '~/modules/stations/types'

/**
 * Ricerca stazioni in linguaggio naturale (ADR-0007): non restituisce
 * stazioni, restituisce filtri. I criteri estratti si **sommano** ai filtri
 * già attivi nella barra classica — vengono aggiornati solo i campi che la
 * query nomina davvero, quelli non citati (e la posizione della mappa)
 * restano intatti. Così "stazioni Ionity" non azzera un "min 50 kW"
 * impostato a mano: la ricerca NL aggiunge criteri sopra la vista corrente,
 * non la ridefinisce (vedi ADR). `pending`/`error` separati da quelli di
 * `useStations()`: un errore qui (Claude non raggiungibile, rate limit) non
 * deve svuotare la lista stazioni già mostrata — l'utente può sempre
 * ripiegare sulla barra filtri normale.
 */
export type NlSearchErrorCode = 'rate_limited' | 'daily_cap' | 'not_configured' | 'failed'

export function useNlSearch() {
  const filtersStore = useStationsFiltersStore()
  const pending = ref(false)
  // Codice, non un messaggio già tradotto: il componente sceglie il testo
  // (i18n) — stessa regola già seguita per i KPI generati server-side.
  const error = ref<NlSearchErrorCode | null>(null)

  // `string | null`, non solo `string`: il campo è `clearable` (Vuetify
  // setta il v-model a `null` sul pulsante di pulizia, non a stringa vuota)
  // — difesa in profondità sull'API pubblica del composable, non solo nel
  // componente che lo chiama oggi.
  async function search(query: string | null) {
    const trimmed = (query ?? '').trim()
    if (!trimmed) return
    // Un secondo Invio/click mentre la prima ricerca è ancora in volo
    // manderebbe una seconda POST identica (2 chiamate Claude, 2 incrementi
    // del rate limiter) — esattamente ciò che il tetto costi dell'ADR-0007
    // vuole evitare. Il template ha già una sola via per Invio e una per il
    // click; questa guardia è la difesa in profondità sull'API pubblica.
    if (pending.value) return

    pending.value = true
    error.value = null
    try {
      const { filters } = await stationRepository.nlSearch(
        trimmed,
        filtersStore.filters.countryCode
      )
      // Merge, non replace: scrivo solo i campi che la query ha davvero
      // estratto. Un `null` significa "non menzionato" — il valore corrente
      // del filtro resta, non viene sovrascritto con `undefined`.
      const patch: Partial<StationFilters> = {}
      if (filters.search !== null) patch.search = filters.search
      if (filters.connectionTypeId !== null) patch.connectionTypeId = filters.connectionTypeId
      if (filters.operatorId !== null) patch.operatorId = filters.operatorId
      if (filters.statusTypeId !== null) patch.statusTypeId = filters.statusTypeId
      if (filters.minPowerKw !== null) patch.minPowerKw = filters.minPowerKw
      filtersStore.setFilters(patch)
    } catch (caught) {
      if (caught instanceof FetchError && caught.statusCode === 429) {
        // Due 429 diversi, non lo stesso evento per l'utente: il tetto
        // giornaliero globale (data.code, vedi nl-search.post.ts) non si
        // sblocca "tra poco" come il rate limit per-IP — rimanda ai filtri
        // classici, non a un retry a breve.
        // `caught.data` è l'intero corpo dell'errore H3 (statusCode/message/
        // data/...), non solo il suo campo `data` — un livello di nesting
        // in più rispetto a quanto ci si aspetterebbe dal nome.
        error.value = caught.data?.data?.code === 'daily_cap' ? 'daily_cap' : 'rate_limited'
      } else if (caught instanceof FetchError && caught.statusCode === 503) {
        error.value = 'not_configured'
      } else {
        error.value = 'failed'
      }
    } finally {
      pending.value = false
    }
  }

  return { search, pending, error }
}
