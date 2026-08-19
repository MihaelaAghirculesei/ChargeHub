# ADR-0004: Struttura feature-first (`app/modules/`), non per tipo di file

## Stato

Accettato — 2026-08-18.

## Contesto

Nuxt non impone una struttura per il codice applicativo oltre alle cartelle
con significato speciale (`pages/`, `components/`, `composables/`,
`layouts/`, `server/`). Il progetto ha sei aree funzionali distinte
(stazioni, sessioni, analytics, tariffe, auth) ciascuna con il proprio
repository client, store, composable e componenti — la domanda è come
organizzarle: per **tipo di file** (`components/`, `composables/`,
`stores/` a livello globale, con nomi che iniziano tutti per `Station*`,
`Session*`...) o per **feature**.

## Decisione

`app/modules/<feature>/` — ogni modulo è un piccolo verticale autosufficiente:

```
app/modules/stations/
├── components/       # StationsMap.vue, StationsTable.vue, StationDetail.vue...
├── composables/       # useStations, useStation, useStationReferenceData
├── stores/             # stations.store.ts, stations-filters.store.ts
├── telemetry/          # transport.ts, polling-transport.ts (Giorno 11)
├── repository.ts        # unico punto che sa che i dati vivono dietro /api/stations
├── types.ts
└── index.ts             # barrel: cosa il modulo espone all'esterno
```

Le pagine (`app/pages/stations/index.vue`, `[id].vue`) restano sottili:
compongono componenti dei moduli, non contengono logica propria oltre
`definePageMeta`/`useSeoMeta`. Codice condiviso da più moduli (formattazione
locale, tema) vive in `app/shared/composables/`, non duplicato né promosso
prematuramente a "core" prima di essere davvero condiviso da almeno due
moduli.

## Perché non "per tipo di file"

Con sei feature, una struttura per tipo (`app/components/`, `app/stores/`,
`app/composables/` tutte piatte) avrebbe prodotto cartelle da 20+ file
ordinati solo per prefisso di nome, dove capire "cosa tocca il modulo
stazioni" richiede di scorrere ogni cartella. `app/modules/stations/` risponde
da solo: aprendolo si vede l'intera superficie di quella feature. Il costo
reale è la ricerca cross-modulo ("dove uso `useAuth`?") — mitigato dai barrel
`index.ts` (l'unica cosa che serve a chi importa da fuori) e da import
alias (`~/modules/...`) invece di percorsi relativi lunghi.

## Conseguenze

- Un modulo che cresce troppo (stazioni ha mappa + tabella + filtri +
  telemetria live) resta comunque un solo modulo, non forza una
  sotto-suddivisione artificiale solo per contenere la dimensione delle
  cartelle.
- `shared/` è per codice usato da **almeno due** moduli — una regola
  esplicita per non trasformarlo in un cestino di tutto ciò che non si sa
  dove mettere.
- Il barrel (`index.ts`) di ogni modulo è la superficie pubblica: un test o
  un altro modulo importa da lì, non da un file interno specifico — permette
  di rifattorizzare l'interno di un modulo senza toccare chi lo consuma.
