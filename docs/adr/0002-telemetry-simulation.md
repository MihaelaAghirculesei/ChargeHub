# ADR-0002: Telemetrie-Simulator (Nicht-OCM-Daten, deterministisch und zustandslos)

## Status

Angenommen — 2026-08-18.

## Kontext

Open Charge Map ist ein **Register**: Stammdaten von Stationen und
Anschlüssen, gepflegt von denen, die sie erfassen, kein Live-Feed. Es liefert
nicht "lädt gerade, mit wie viel kW". Der Plan (Tag 10) verlangt jedoch ein
Dashboard, das den dynamischen Status eines Ladepunkts im OCPP-Stil zeigt
(`Available`/`Charging`/`Faulted`/`Offline`), mit einer Leistung, die einer
plausiblen Ladekurve folgt — da kein echter Feed dieser Art ohne Hardware
oder eine Vereinbarung mit einem CPO zugänglich ist, muss simuliert werden.

Die Randbedingung, die jede Entscheidung hier unten leitet, ist das
Deploy-Ziel: **Vercel, serverless** (festgelegte Entscheidung, siehe
ChargeHub.md §0). Eine Funktionsinstanz überlebt nicht garantiert zwischen
zwei Aufrufen — kein `setInterval`, keine über die Zeit mutierte
Modul-Variable: beim nächsten Cold Start verschwindet dieser Zustand, oder
schlimmer, er divergiert bei mehreren gleichzeitigen Instanzen still und
inkonsistent zwischen Requests.

## Entscheidungen

### 1. Reine Funktion von (Seed, Zeitpunkt), keine zustandsbehaftete State Machine

`computeChargePointTelemetry(connectorId, seedKey, maxPowerKw, now)` in
`server/services/telemetry-simulator.ts` liest und schreibt keinerlei
Zustand: sie erhält den aktuellen Zeitpunkt und gibt zurück, welchen Status
dieser Anschluss zu diesem Zeitpunkt "hätte" — jedes Mal von Grund auf neu
berechnet. Zwei Aufrufe mit demselben `seedKey` und demselben `now` liefern
immer dasselbe Ergebnis (explizit getestet) — das, und nicht eine
persistierte Variable, macht die API über mehrere gleichzeitige
Serverless-Instanzen hinweg reproduzierbar und konsistent.

`seedKey` wird stabil aus echten OCM-IDs abgeleitet
(`` `station-${station.id}-connector-${connector.id}` ``), nie zufällig
generiert: derselbe Anschluss hat bei jedem Request immer denselben
"Charakter" (Zyklusdauer, Zuverlässigkeit), selbst von verschiedenen
Serverless-Instanzen, die nichts miteinander teilen.

### 2. Echte Zeit ersetzt Zustand: ein deterministischer Zyklus modulo der Uhr

Aus `seedKey` wird ein **Anschluss-Profil** abgeleitet (FNV-1a-Hash gefolgt
von einem Mulberry32-PRNG, beide deterministisch und ohne Abhängigkeiten):
Zykluslänge (10–30 Minuten), Anteil des Zyklus als `Available` vor dem
erneuten Laden, Anteil als `Charging`, eine Phasenverschiebung und ein
Zuverlässigkeits-"Wurf". Der Anschluss durchläuft den Zyklus einfach dadurch,
dass `now` fortschreitet — es gibt keinen Anwendungs-Timer, es ist der Modulo
der aktuellen Epoch bezogen auf die Zykluslänge
(`epochSeconds % cycleLengthSeconds`, mit vorher addierter
Phasenverschiebung). Verschiedene Anschlüsse haben verschiedene Profile
(verschiedener Seed), landen also nie alle synchron im selben Status —
verifiziert in `tests/unit/server/services/telemetry-simulator.test.ts`.

Am Ende des Zyklus (nach der Ladephase) ist der Status meist `Available`,
mit einem pro Anschluss stabilen Zuverlässigkeits-Wurf, der entscheidet, ob
er gelegentlich `Faulted` (6 % der Anschlüsse) oder `Offline` (weitere 4 %)
wird, statt verfügbar zu werden.

### 3. Leistungs- und Energiekurve analytisch aus dem Fortschritt berechnet, nicht akkumuliert

Während `Charging` ist die Leistung ein Bruchteil von `maxPowerKw` (der
**echte** Wert von OCM, nicht erfunden) als Funktion des Fortschritts `0..1`
in der Sitzung: fast flach bis 80 % (fällt nur um 30 %), dann steiler in den
verbleibenden 20 % — die für echtes Laden typische Kurve "schnell am Anfang,
langsamer gegen Ende", ohne für jede Batterietechnologie ein eigenes Profil
erfinden zu müssen.

Die Sitzungsenergie (kWh) ist das Integral dieser Kurve zwischen 0 und der
verstrichenen Zeit — **numerisch** berechnet (Trapezintegration, 60
Stichproben) statt mit einer handgeschriebenen geschlossenen Formel: leichter
auf Korrektheit zu prüfen und künftig anzupassen, falls sich die Kurvenform
ändert, bei vernachlässigbaren Rechenkosten pro Request.

Sowohl Leistung als auch Energie hängen nur davon ab, wie viel Zeit seit dem
Beginn der aktuellen Sitzung vergangen ist (auch das aus dem Zyklus-Modulo
abgeleitet, nicht gespeichert) — keine zustandsbehaftete Akkumulation, und
dennoch wächst die Energie von Aufruf zu Aufruf monoton, solange die Sitzung
andauert (getestet).

### 4. Standardleistung für Anschlüsse ohne bekannten `PowerKW`

Nicht jeder OCM-Anschluss hat einen von der erfassenden Person eingetragenen
`PowerKW` (`shared/schemas/station.ts`, `powerKw: number | null`). Sie immer
als `Available` zu simulieren wäre genauso falsch wie eine exakte Zahl zu
erfinden: es wird ein plausibler, deklarierter Standardwert verwendet
(`DEFAULT_POWER_KW = 11`, gängige dreiphasige AC-Leistung) — nur für die
Simulation. Die ursprünglichen OCM-Daten (`null`) bleiben an allen anderen
Stellen der App unverändert.

### 5. Batch-Endpoint, nicht "alle Stationen"

`GET /api/telemetry?stationId=1,2,3` akzeptiert eine Liste von IDs (max. 20),
keinen "gib mir alles"-Parameter: spiegelt wider, wie das Dashboard es
tatsächlich nutzen würde (sichtbare Stationen in einer Ansicht, nicht das
gesamte Register), und nutzt `fetchStationById` wieder — also denselben
24-Stunden-Cache wie `GET /api/stations/:id` — für die Anschluss-Spezifika.
Existiert eine ID nicht in OCM, wird sie still aus der Antwort ausgeschlossen
(leeres oder teilweises Array, nie ein Fehler), statt den gesamten
Batch-Request wegen einer einzelnen falschen ID scheitern zu lassen.

## Wie es mit einem echten Feed ersetzt würde

Sollte künftig ein echter Feed verfügbar sein (OCPP über einen CPO, ein
WebSocket, ein MQTT-Feed), ist die Austauschstelle isoliert:
`computeStationTelemetry`/`computeChargePointTelemetry` sind der einzige
Punkt, den `server/api/telemetry.get.ts` aufruft, um den dynamischen Status
zu erhalten — sie müssten durch einen Aufruf des echten Dienstes ersetzt
werden (oder ein Lesen aus einem per Webhook aktualisierten Store), wobei
sowohl der Endpoint-Vertrag (`shared/schemas/telemetry.ts`) als auch der
Rest der App unverändert bleiben, die nur diesen Vertrag konsumiert und
nicht weiß, wie die Daten erzeugt werden.

## Konsequenzen

- Kein zu persistierender Zustand: kompatibel wie es ist mit Serverless-
  Funktionen ohne Instanz-Affinität, ohne Redis oder eine Datenbank nur um
  eine Simulations-"Uhr" am Leben zu halten.
- Die Daten sind bewusst **nicht** direkt von OCM abgeleitet: nur
  `maxPowerKw` und die Stations-/Anschluss-IDs kommen von OCM, der Rest ist
  berechnet. `Station`/`shared/schemas/station.ts` wurden nicht um
  Telemetrie-Felder erweitert — `StationTelemetry` ist absichtlich ein neuer,
  eigenständiger Domänentyp, damit nicht der Eindruck entsteht, diese Daten
  kämen aus dem Register.
- Der Zuverlässigkeits-Wurf ist pro Anschluss fest (leitet sich aus dem Seed
  ab): ein "unglücklicher" Anschluss bleibt es immer, sein Verhalten ändert
  sich nicht bei jedem Request — realistisch (manche Anlagen fallen öfter aus
  als andere), aber es lohnt sich, das im Hinterkopf zu behalten, falls
  künftig eine über die Zeit variierende Ausfallwahrscheinlichkeit gewünscht
  wird.
