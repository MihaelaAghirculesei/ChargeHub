# ADR-0005: Pinia nur für geteilten Client-State, nicht für Server-Daten

## Status

Angenommen — 2026-08-18.

## Kontext

Die App hat zwei klar getrennte Kategorien von Zustand, und sie zu verwechseln
ist der häufigste Fehler mit Pinia in einer Nuxt-App:

1. **Daten, die vom Server kommen** (Stationen, Sitzungen, Telemetrie, KPIs)
   — haben bereits Cache/Fetch/Loading-State, verwaltet von Nuxts
   `useAsyncData`/`useFetch`, mit eingebautem SSR, Deduplizierung und
   Invalidierung.
2. **Reiner Client-State, zwischen nicht verwandten Komponenten geteilt** —
   Stationssuchfilter (Tag 4), Hell-/Dunkel-Theme (Tag 2), von Nutzer:innen
   angelegte Tarife (Tag 15), authentifizierte Session (Tag 16).

## Entscheidung

Pinia **nur** für Kategorie 2. Jeder Store ist auf das ihn besitzende Modul
gescoped (`stations-filters.store.ts`, `tariffs.store.ts`, nicht ein
einziger globaler Store): spiegelt dieselbe Feature-first-Struktur wie
[ADR-0004](0004-modular-structure.md) wider, kein einheitlicher
"App-State"-Container.

Server-Daten fließen **nicht** durch Duplizierung in einen Pinia-Store — die
Modul-Composables (`useStations`, `useKpis`...) rufen direkt `useAsyncData`
gegen das Modul-Repository auf. Ein einziger Store bildet die Ausnahme
(`stations.store.ts`, Tag 4): er cached die Daten nicht selbst, sondern
kapselt den `useAsyncData`-Aufruf hinter einem stabilen Interface, das sowohl
die Karte als auch die Stationstabelle konsumieren — so werden zwei
unabhängige Fetches für denselben Suchbereich vermieden.

## Warum kein einheitlicher Pinia-State für alles

Daten in Pinia zu duplizieren, die `useAsyncData` bereits verwaltet (SSR,
Cache, Refetch), bedeutet, diese Logik von Hand neu zu implementieren — oft
schlechter — und zwei Wahrheitsquellen zu haben, die auseinanderlaufen
können (Nuxts SSR-hydratisierter Cache und ein separat per `onMounted`
gefüllter Pinia-Store). Die Stationsfilter, das Theme, die Tarife haben
dagegen keinen "Server" zum Abfragen — es ist Client-State, der die
Navigation zwischen Seiten überleben und über Sitzungen hinweg persistiert
werden muss (`useCookie`, nicht `localStorage`: auch in SSR gelesen, für den
ersten Paint bereits im richtigen Zustand — dasselbe Prinzip für Theme,
Filter und Tarife).

## Konsequenzen

- Kein manueller Watcher, um "Nuxt-Cache" und "Pinia-Store" für dieselben
  Daten synchron zu halten — diese Duplizierung existiert nicht.
- Ein Test eines Pinia-Stores (z. B. `tariffs.store.test.ts`) bleibt ein Test
  reiner Logik (lokales CRUD, Validierung), nie ein Test, der zusätzlich
  `useAsyncData` mocken muss.
- Die Persistenz über `useCookie` (kein `pinia-plugin-persistedstate`-Plugin)
  ist eine bewusste Entscheidung: keine zusätzliche Abhängigkeit für Stores,
  die nur einen Reload überleben müssen — konsistent in allen drei Fällen
  (Theme, Filter, Tarife).
