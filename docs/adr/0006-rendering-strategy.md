# ADR-0006: Rendering ibrido per rotta — non un solo modo per tutta l'app

## Stato

Accettato — 2026-08-19 (Giorno 21), con un tentativo respinto documentato sotto.

## Contesto

Nuxt rende ogni pagina server-side per default. Non tutte le pagine di
questa app hanno lo stesso profilo: il dettaglio stazione ha dati che
cambiano raramente e beneficia di SSR completo al primo paint (Giorno 9);
la dashboard mostra KPI derivati da OCM + simulatori (Giorno 10-13), mai
davvero statici né identici per due visitatori; il login non ha alcun dato
per-richiesta nell'HTML.

## Decisioni

### `routeRules` per rotta, non un default globale

- `/login`: `{ prerender: true }` — l'unica pagina di questa app senza
  alcun dato per-richiesta nell'HTML (il redirect "già loggato" e quello
  dopo il login girano lato client via `useAuth()`/query string, non
  nel markup).
- `/` (dashboard): `{ ssr: false }` — client-side puro. KPI derivati da
  OCM + simulatori, mai statici né utili da pre-renderizzare identici per
  ogni visitatore.
- Dettaglio stazione (`/stations/:id`): SSR di default, invariato — resta
  essenziale per il "Fatto quando" del Giorno 9 (contenuto completo nella
  prima risposta, non solo dopo l'idratazione).

### Tentato e respinto: `swr` sul dettaglio stazione

Per evitare di ricalcolare dati OCM che non cambiano a ogni richiesta, il
tentativo naturale era `swr: 300` (stale-while-revalidate/ISR) sulla rotta
di dettaglio. **Rotto**, verificato con un browser reale sia in `pnpm dev`
sia nella build di produzione: con `swr` attivo il client tenta di caricare
un `/_payload.json` di supporto (pensato per prerender/ISR) che con `swr`
da solo non viene generato — 404, poi `[Vue warn]: Hydration node mismatch`,
e il contenuto della pagina sparisce subito dopo il primo paint. Un `curl`
vede solo l'HTML SSR iniziale (corretto) e si ferma lì, cieco a qualunque
cosa succeda dopo durante l'idratazione — un bug che un `curl` da solo non
avrebbe mai potuto rivelare, e che avrebbe rotto la pagina per ogni
visitatore vero se non fosse stato trovato prima del rilascio.

**Tolto.** Il dettaglio stazione resta SSR puro, senza caching applicativo
aggiuntivo oltre a quello che Nitro/il CDN forniscono già di default per
risposte non esplicitamente marcate. Da riconsiderare se questa
combinazione Nuxt/Nitro cambia comportamento in una versione futura.

## Perché non un solo modo per tutta l'app

Un default unico (tutto SSR, o tutto client-side) avrebbe sacrificato o il
"Fatto quando" del Giorno 9 (contenuto SSR completo per il dettaglio
stazione) o la semplicità della dashboard (che non ha bisogno di SSR per
dati che cambiano ad ogni visita). `routeRules` di Nitro rende questa scelta
per-rotta esplicita in un solo punto (`nuxt.config.ts`), non sparsa in
`definePageMeta` di pagine diverse.

## Conseguenze

- La dashboard, essendo client-side, penalizza per costruzione le metriche
  Lighthouse legate al primo paint (FCP/LCP) rispetto a una pagina SSR
  equivalente — una scelta intenzionale, non una regressione da inseguire.
  Il gate Lighthouse in CI (Giorno 22) scansiona il dettaglio stazione
  (SSR), non la dashboard, per questo motivo.
- Nessun caching HTTP applicativo (`swr`/ISR) sul dettaglio stazione al
  momento — ogni richiesta rifà il fetch verso OCM. Se il volume di
  traffico dovesse giustificarlo, la strada corretta è capire perché
  l'estrazione del payload fallisce con `swr` in questa versione di
  Nuxt/Nitro, non riprovare lo stesso `swr` sperando in un esito diverso.
