# ADR-0002: Simulatore di telemetria (dati non-OCM, deterministico e stateless)

## Stato

Accettato — 2026-08-18.

## Contesto

Open Charge Map è un **registro**: anagrafica di stazioni e connettori,
aggiornata da chi la censisce, non un feed live. Non offre "sta caricando
adesso, a quanti kW". Il piano (Giorno 10) chiede però una dashboard che
mostri lo stato dinamico di un punto di ricarica in stile OCPP
(`Available`/`Charging`/`Faulted`/`Offline`), con una potenza che segua una
curva di ricarica plausibile — dato che nessun feed reale del genere è
accessibile senza hardware o un accordo con un CPO, va simulato.

Il vincolo che guida ogni decisione qui sotto è il target di deploy: **Vercel,
serverless** (decisione bloccata, vedi ChargeHub.md §0). Un'istanza di
funzione non è garantita sopravvivere tra un'invocazione e la successiva —
niente `setInterval`, niente variabile di modulo mutata nel tempo: al
prossimo cold start quello stato sparisce o, peggio, con più istanze
concorrenti diverge in modo silenzioso e incoerente tra una richiesta e
l'altra.

## Decisioni

### 1. Funzione pura di (seed, istante), non una macchina a stati con memoria

`computeChargePointTelemetry(connectorId, seedKey, maxPowerKw, now)` in
`server/services/telemetry-simulator.ts` non legge né scrive alcuno stato:
riceve l'istante corrente e restituisce lo stato che quel connettore
"avrebbe" in quel momento, ricalcolato da zero ogni volta. Due invocazioni
con lo stesso `seedKey` e lo stesso `now` restituiscono sempre lo stesso
risultato (testato esplicitamente) — è questo, non una variabile persistita,
che rende l'API riproducibile e coerente su più istanze serverless
concorrenti.

`seedKey` è derivato in modo stabile da id reali di OCM
(`` `station-${station.id}-connector-${connector.id}` ``), mai generato a
caso: lo stesso connettore ha sempre lo stesso "carattere" (durata di ciclo,
affidabilità) a ogni richiesta, anche da istanze serverless diverse che non
condividono nulla tra loro.

### 2. Il tempo reale sostituisce lo stato: un ciclo deterministico modulo l'orologio

Da `seedKey` si deriva un **profilo del connettore** (hash FNV-1a seguito da
un PRNG Mulberry32, entrambi deterministici e senza dipendenze):
lunghezza del ciclo (10–30 minuti), quota di ciclo `Available` prima di
ricaricare, quota `Charging`, uno sfasamento e un "roll" di affidabilità.
Il connettore attraversa il ciclo semplicemente perché `now` avanza — non
c'è un timer applicativo, è il modulo dell'epoch corrente rispetto alla
lunghezza del ciclo (`epochSeconds % cycleLengthSeconds`, con lo sfasamento
sommato prima). Connettori diversi hanno profili diversi (seed diverso), quindi
non risultano mai tutti sincronizzati sullo stesso stato — verificato in
`tests/unit/server/services/telemetry-simulator.test.ts`.

Nella coda del ciclo (dopo la fase di ricarica) lo stato è per lo più
`Available`, con un roll di affidabilità stabile per connettore che decide se
diventa occasionalmente `Faulted` (6% dei connettori) o `Offline` (4%
aggiuntivo) invece di tornare disponibile.

### 3. Curva di potenza e energia calcolate analiticamente dal progresso, non accumulate

Durante `Charging`, la potenza è una frazione di `maxPowerKw` (il valore
**reale** da OCM, non inventato) in funzione del progresso `0..1` nella
sessione: quasi piatta fino all'80% (cala solo del 30%), poi più ripida nel
restante 20% — la curva "carica veloce all'inizio, rallenta verso la fine"
tipica della ricarica reale, senza dover inventare un profilo per ogni
tecnologia di batteria.

L'energia di sessione (kWh) è l'integrale di quella curva tra 0 e il tempo
trascorso — calcolato **numericamente** (integrazione trapezoidale, 60
campioni) invece che con una primitiva in forma chiusa scritta a mano: più
facile da verificare per correttezza e da modificare in futuro se la curva
cambia forma, a un costo computazionale trascurabile per richiesta.

Sia potenza sia energia dipendono solo da quanto tempo è trascorso dall'inizio
della sessione corrente (anch'esso derivato dal modulo del ciclo, non
memorizzato) — nessun accumulo stateful, eppure l'energia cresce in modo
monotono chiamata dopo chiamata finché la sessione prosegue (testato).

### 4. Potenza di default per connettori senza `PowerKW` noto

Non tutti i connettori OCM hanno un `PowerKW` compilato da chi li ha censiti
(`shared/schemas/station.ts`, `powerKw: number | null`). Simularli sempre
`Available` sarebbe sbagliato quanto inventare un numero preciso: si usa un
default plausibile e dichiarato (`DEFAULT_POWER_KW = 11`, potenza AC
trifase comune) solo per la simulazione — il dato OCM originale (`null`)
resta intatto altrove nell'app.

### 5. Endpoint batch, non "tutte le stazioni"

`GET /api/telemetry?stationId=1,2,3` accetta una lista di id (max 20),
non un parametro "dammi tutto": rispecchia come la dashboard la userebbe
davvero (stazioni visibili in una vista, non l'intero registro), e riusa
`fetchStationById` — quindi la stessa cache 24h di
`GET /api/stations/:id` — per le specifiche dei connettori. Se un id non
esiste su OCM viene silenziosamente escluso dalla risposta (array vuoto o
parziale, mai un errore) invece di far fallire l'intera richiesta batch per
un singolo id sbagliato.

## Come si sostituirebbe con un feed reale

Se in futuro fosse disponibile un feed reale (OCPP via un CPO, un WebSocket,
un feed MQTT), il punto di sostituzione è isolato:
`computeStationTelemetry`/`computeChargePointTelemetry` sono l'unico punto
che `server/api/telemetry.get.ts` chiama per ottenere lo stato dinamico —
andrebbero sostituite con una chiamata al servizio reale (o una lettura da
uno store aggiornato da un webhook), lasciando invariati sia il contratto
dell'endpoint (`shared/schemas/telemetry.ts`) sia il resto della app, che
consuma solo quel contratto e non sa come i dati vengono prodotti.

## Conseguenze

- Nessuno stato da persistere: compatibile as-is con funzioni serverless
  senza affinità di istanza, senza bisogno di Redis o di un database solo
  per tenere in vita un "orologio" della simulazione.
- I dati sono deliberatamente **non** derivati da OCM in modo diretto: solo
  `maxPowerKw` e gli id di stazione/connettore vengono da OCM, il resto è
  calcolato. `Station`/`shared/schemas/station.ts` non sono stati estesi con
  campi di telemetria — `StationTelemetry` è un tipo di dominio nuovo e
  separato apposta, per non far credere che questi dati vengano dal registro.
- Il roll di affidabilità è fisso per connettore (deriva dal seed): un
  connettore "sfortunato" lo resta sempre, non cambia comportamento a ogni
  richiesta — realistico (alcuni impianti guastano più spesso di altri) ma
  vale la pena ricordarlo se in futuro si volesse una probabilità di guasto
  che vari nel tempo.
