# ADR-0003: Live-Updates via Polling hinter einem Interface, nicht WebSocket

## Status

Angenommen — 2026-08-18.

## Kontext

Der Telemetrie-Simulator (Tag 10, `docs/adr/0002-telemetry-simulation.md`)
stellt `GET /api/telemetry` bereit: ein im Handumdrehen berechneter
Snapshot, ohne Zustand. Der Plan (Tag 11) verlangt, dass das Dashboard die
Entwicklung dieses Zustands widerspiegelt, ohne dass Nutzer:innen die Seite
neu laden — mit: automatischer Pause, wenn der Tab nicht sichtbar ist,
flüssigem Übergang der Werte (nie ein abrupter Sprung), einem
Verbindungsindikator (live/Wiederverbindung/offline) und einem Transport
"hinter einem Interface", sodass ein Wechsel zu SSE oder WebSocket nur eine
Datei betrifft.

## Entscheidungen

### 1. Polling, nicht WebSocket

Das Deployment bleibt serverless (Vercel, festgelegte Entscheidung §0 —
dieselbe Randbedingung, die auch den Simulator zustandslos gemacht hat,
ADR-0002). Ein WebSocket erfordert eine persistente Verbindung pro Client:
auf einer Serverless-Plattform bedeutet das entweder einen dedizierten
externen Dienst (Pusher, Ably, ein Durable Object) oder den Verzicht auf das
Serverless-Deployment für diese Route — echte architektonische Kosten, nicht
gerechtfertigt für Daten, die sich plausibel alle paar Sekunden ändern, nicht
in Echtzeit auf Millisekundenebene. Ein `GET /api/telemetry` in Intervallen
ist einfach, genauso zustandslos wie der Simulator selbst, und erfordert
nichts Neues auf der Infrastrukturseite.

### 2. Der Transport hinter einem expliziten Interface

`app/modules/stations/telemetry/transport.ts` definiert
`TelemetryTransport`: eine einzige Methode, `start(stationIds, { onUpdate,
onStatusChange })`, die eine Stop-Funktion zurückgibt. `useLiveTelemetry()`
(`app/modules/stations/composables/useLiveTelemetry.ts`) weiß nicht, ob
dahinter Polling, SSE oder ein WebSocket steckt — es verwaltet nur
reaktiven Zustand (`telemetry`, `status`), die Pause bei verstecktem Tab und
das Cleanup. `polling-transport.ts` ist heute die einzige Implementierung;
künftig zu SSE zu wechseln bedeutet, eine neue mit derselben Form zu
schreiben (`new EventSource(...)` statt `setTimeout`), ohne das Composable
oder die Komponenten anzufassen, die es nutzen.

Sekundärer Vorteil, nicht der Hauptgrund: der Transport ist injizierbar
(`useLiveTelemetry(ids, { transport })`), sodass die Tests des Composables
einen Fake-Transport statt echte `$fetch`-Aufrufe/Timer mocken.

### 3. Selbst-planendes `setTimeout`, nicht `setInterval`

`pollingTelemetryTransport` plant den nächsten Poll erst **nachdem** der
vorherige abgeschlossen ist (Erfolg oder Fehlschlag), nicht stur alle 5s.
Mit reinem `setInterval` könnte ein langsamer Request (instabiles Netzwerk,
Serverless-Cold-Start des Endpoints) einen zweiten, überlappenden Request
starten, bevor der erste zurückgekommen ist — hier kann das nicht passieren.

### 4. Verbindungsindikator mit 3 Zuständen, kein Boolean

`live`/`reconnecting`/`offline`: ein isolierter Fehlschlag (ein verlorener
Request) darf die gesamte Verbindung nicht sofort als "offline"
kennzeichnen — sie durchläuft erst "Wiederverbindung" und wird **erst** nach
einem zweiten aufeinanderfolgenden Fehlschlag zu "offline"
(`OFFLINE_AFTER_FAILURES = 2` in `polling-transport.ts`). Ein Boolean
`isLive` hätte diese vom Plan explizit geforderte Unterscheidung nicht
abbilden können.

### 5. Pause bei verstecktem Tab: injizierbare `visibility`, nicht nur direktes `useDocumentVisibility()`

Das Composable nutzt standardmäßig `useDocumentVisibility()` von VueUse,
akzeptiert es aber auch als Parameter (`{ visibility }`) — nur für Tests: das
erlaubt, die Sichtbarkeit mit einem beliebigen `ref` zu steuern, statt
`document.visibilityState`/das `visibilitychange`-Event in `happy-dom`
simulieren zu müssen. Dasselbe Prinzip, das bereits bei `transport`
verwendet wird (injizierbar für Testbarkeit), hier aus demselben
praktischen Grund angewendet, nicht wegen eines hypothetischen künftigen
Bedarfs an mehreren Sichtbarkeitsquellen.

### 6. Flüssiger Übergang: Vuetifys `v-progress-linear`, keine eigene Animation

Die Leistung während des Ladens wird auch als Balken angezeigt
(`v-progress-linear :model-value="..."`, in `StationDetail.vue`): Vuetify
wendet bei jeder Änderung von `model-value` bereits einen CSS-Übergang auf
die Breite an, sodass jedes 5-Sekunden-Update gleitet statt springt — ohne
dafür etwas Neues zu schreiben oder zu importieren.

## Konsequenzen

- Keine zusätzliche Infrastruktur (Broker, externer Realtime-Dienst):
  `GET /api/telemetry` bleibt der einzige beteiligte Endpoint, dasselbe
  Deployment wie der Rest der App.
- Die Kosten des Pollings sind O(offene Tabs × 1 Request/5s), nicht
  O(persistente Verbindungen): akzeptabel für ein internes Dashboard, neu zu
  bewerten, falls künftig Sub-Sekunden-Latenz oder Tausende gleichzeitige
  Clients gebraucht würden — der Austausch ist dann per Design auf die
  Transport-Datei isoliert.
- Der Zuverlässigkeits-Wurf des Simulators (ADR-0002) gilt pro Anschluss,
  nicht pro Request: ein vom Verbindungsindikator gezeigtes "offline"
  spiegelt immer ein echtes Transportproblem wider (Netzwerk/Server), nie
  den simulierten OCPP-Status `Offline` eines Anschlusses — die beiden
  Konzepte bleiben bewusst getrennt (`TelemetryConnectionStatus` lebt im
  Anwendungsmodul, nicht in `shared/schemas/telemetry.ts`).
