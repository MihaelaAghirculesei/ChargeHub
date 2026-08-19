# ADR-0005: Pinia solo per stato client condiviso, non per i dati del server

## Stato

Accettato — 2026-08-18.

## Contesto

L'app ha due categorie di stato ben distinte, e confonderle è l'errore più
comune con Pinia in un'app Nuxt:

1. **Dati che vengono dal server** (stazioni, sessioni, telemetria, KPI) —
   hanno già una cache/fetch/loading state gestiti da `useAsyncData`/
   `useFetch` di Nuxt, con SSR, deduplicazione e invalidazione integrati.
2. **Stato client puro, condiviso tra componenti non imparentati** — filtri
   di ricerca stazioni (Giorno 4), tema chiaro/scuro (Giorno 2), tariffe
   create dall'utente (Giorno 15), sessione autenticata (Giorno 16).

## Decisione

Pinia **solo** per la categoria 2. Ogni store è scoped al modulo che lo
possiede (`stations-filters.store.ts`, `tariffs.store.ts`, non un unico
store globale): riflette la stessa struttura feature-first di
[ADR-0004](0004-modular-structure.md), non un contenitore unico di "stato
dell'app".

I dati dal server **non** entrano in uno store Pinia duplicandoli — i
composable dei moduli (`useStations`, `useKpis`...) chiamano direttamente
`useAsyncData` verso il repository del modulo. Un solo store fa eccezione
(`stations.store.ts`, Giorno 4): non cache-a i dati lui stesso, incapsula
la chiamata `useAsyncData` dietro un'interfaccia stabile che sia la mappa
sia la tabella delle stazioni consumano, evitando due fetch indipendenti
per la stessa area di ricerca.

## Perché non uno stato Pinia unico per tutto

Duplicare in Pinia dati che `useAsyncData` già gestisce (SSR, cache,
refetch) significa reimplementare a mano quella logica, spesso peggio, e
avere due fonti di verità che possono disallinearsi (la cache SSR-idratata
di Nuxt e uno store Pinia riempito da un `onMounted` separato). I filtri
stazioni, il tema, le tariffe non hanno invece un "server" da interrogare —
sono stato client che deve sopravvivere alla navigazione tra pagine e
persistere tra sessioni (`useCookie`, non `localStorage`: letto anche in
SSR per il primo paint già nello stato giusto, stesso principio per tema,
filtri e tariffe).

## Conseguenze

- Nessun watcher manuale per tenere sincronizzati "cache Nuxt" e "store
  Pinia" per lo stesso dato — non esiste quella duplicazione.
- Un test di uno store Pinia (es. `tariffs.store.test.ts`) resta un test
  di logica pura (CRUD locale, validazione), mai un test che deve anche
  mockare `useAsyncData`.
- La persistenza via `useCookie` (non un plugin `pinia-plugin-persistedstate`)
  è una scelta deliberata: nessuna dipendenza aggiuntiva per store che
  devono solo sopravvivere a un reload, coerente in tutti e tre i casi
  (tema, filtri, tariffe).
