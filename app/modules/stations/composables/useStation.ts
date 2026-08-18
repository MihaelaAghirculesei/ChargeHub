import { useStationsStore } from '~/modules/stations/stores/stations.store'

/**
 * Punto di ingresso pubblico per la stazione singola (pagina di dettaglio,
 * Giorno 9): nessuna pagina/componente chiama `stationRepository` o
 * `useStationsStore` direttamente per questo.
 *
 * `async` + `await useAsyncData(...)` internamente, non solo
 * `useAsyncData(...)` destrutturato subito: la pagina deve poter fare
 * `await useStation(id)` e controllare *sincronamente subito dopo*
 * `station.value` per decidere se lanciare un 404 — se questa funzione
 * restituisse un oggetto semplice (non una vera Promise), quell'`await`
 * nella pagina non aspetterebbe nulla, e il controllo vedrebbe sempre
 * `station.value` ancora `undefined` (bug reale, trovato verificando dal
 * vivo: la pagina dava 404 anche per stazioni esistenti).
 */
export async function useStation(id: MaybeRefOrGetter<number>) {
  const stationsStore = useStationsStore()

  const { data, pending, error, refresh } = await useAsyncData(
    () => `station-${toValue(id)}`,
    () => stationsStore.getById(toValue(id)),
    { watch: [() => toValue(id)] }
  )

  return { station: data, pending, error, refresh }
}
