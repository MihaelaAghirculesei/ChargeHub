# ADR-0003: Aggiornamenti live via polling dietro un'interfaccia, non WebSocket

## Stato

Accettato — 2026-08-18.

## Contesto

Il simulatore di telemetria (Giorno 10, `docs/adr/0002-telemetry-simulation.md`)
espone `GET /api/telemetry`: uno snapshot calcolato al volo, senza stato.
Il piano (Giorno 11) chiede che la dashboard rifletta l'evoluzione di quello
stato senza che l'utente ricarichi la pagina, con: pausa automatica quando la
scheda non è visibile, transizione fluida dei valori (mai un salto brusco),
un indicatore di connessione (live/riconnessione/offline), e un transport
"dietro un'interfaccia" così che passare a SSE o WebSocket tocchi un solo
file.

## Decisioni

### 1. Polling, non WebSocket

Il deploy resta serverless (Vercel, decisione bloccata §0 — lo stesso
vincolo che ha reso il simulatore stateless, ADR-0002). Un WebSocket
richiede una connessione persistente per client: su una piattaforma
serverless questo significa o un servizio esterno dedicato (Pusher, Ably,
un Durable Object) o rinunciare al deploy serverless per quella rotta — costo
architetturale reale, non giustificato per un dato che cambia in modo
plausibile ogni pochi secondi, non in tempo reale a livello di millisecondo.
Un `GET /api/telemetry` a intervalli è semplice, stateless quanto il
simulatore stesso, e non richiede nulla di nuovo lato infrastruttura.

### 2. Il transport dietro un'interfaccia esplicita

`app/modules/stations/telemetry/transport.ts` definisce `TelemetryTransport`:
un solo metodo, `start(stationIds, { onUpdate, onStatusChange })`, che
restituisce una funzione di stop. `useLiveTelemetry()`
(`app/modules/stations/composables/useLiveTelemetry.ts`) non sa se dietro
c'è polling, SSE o un WebSocket — gestisce solo stato reattivo (`telemetry`,
`status`), la pausa su tab nascosta e il cleanup. `polling-transport.ts` è
l'unica implementazione oggi; passare a SSE in futuro significa scriverne
una nuova con la stessa forma (`new EventSource(...)` invece di
`setTimeout`), senza toccare il composable né i componenti che lo usano.

Beneficio secondario, non il motivo principale: il transport è iniettabile
(`useLiveTelemetry(ids, { transport })`), quindi i test del composable usano
un transport finto invece di mockare `$fetch`/i timer reali.

### 3. `setTimeout` auto-schedulato, non `setInterval`

`pollingTelemetryTransport` schedula il prossimo poll solo **dopo** che il
precedente è concluso (successo o fallimento), non ogni 5s a prescindere.
Con `setInterval` puro, una richiesta lenta (rete instabile, cold start
serverless dell'endpoint) potrebbe far partire una seconda richiesta
sovrapposta prima che la prima sia tornata — qui non può succedere.

### 4. Indicatore di connessione a 3 stati, non un booleano

`live`/`reconnecting`/`offline`: un fallimento isolato (una richiesta persa)
non deve etichettare subito l'intera connessione come "offline" — passa
prima per "riconnessione" ed **solo** dopo un secondo fallimento consecutivo
diventa "offline" (`OFFLINE_AFTER_FAILURES = 2` in `polling-transport.ts`).
Un booleano `isLive` non avrebbe potuto rappresentare questa distinzione,
richiesta esplicitamente dal piano.

### 5. Pausa su tab nascosta: `visibility` iniettabile, non solo `useDocumentVisibility()` diretto

Il composable usa `useDocumentVisibility()` di VueUse come default, ma lo
accetta anche come parametro (`{ visibility }`) — solo per i test: permette
di controllare la visibilità con un `ref` qualunque invece di dover simulare
`document.visibilityState`/l'evento `visibilitychange` in `happy-dom`. Lo
stesso principio già usato per `transport` (iniettabile per testabilità),
applicato qui per lo stesso motivo pratico, non per un ipotetico bisogno
futuro di più sorgenti di visibilità.

### 6. Transizione fluida: `v-progress-linear` di Vuetify, non un'animazione custom

La potenza durante la ricarica è mostrata anche come barra
(`v-progress-linear :model-value="..."`, in `StationDetail.vue`): Vuetify
applica già una transizione CSS sulla larghezza ad ogni cambio di
`model-value`, quindi ogni aggiornamento a 5s scorre invece di scattare,
senza scrivere né importare nulla di nuovo per farlo.

## Conseguenze

- Nessuna infrastruttura aggiuntiva (broker, servizio realtime esterno):
  `GET /api/telemetry` resta l'unico endpoint coinvolto, stesso deploy
  del resto dell'app.
- Il costo del polling è O(schede aperte × 1 richiesta/5s), non O(connessioni
  persistenti): accettabile per una dashboard interna, da rivalutare se in
  futuro servisse una latenza sub-secondo o migliaia di client concorrenti —
  a quel punto la sostituzione è isolata al file del transport, per design.
- Il roll di affidabilità del simulatore (ADR-0002) è per connettore, non per
  richiesta: un "offline" mostrato dall'indicatore di connessione riflette
  sempre un problema di trasporto reale (rete/server), mai lo stato
  OCPP-simulato `Offline` di un connettore — i due concetti restano distinti
  a bella posta (`TelemetryConnectionStatus` vive nel modulo app, non in
  `shared/schemas/telemetry.ts`).
