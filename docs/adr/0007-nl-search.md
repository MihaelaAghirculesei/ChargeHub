# ADR-0007: Stationssuche in natürlicher Sprache — optionales Feature über Claude, mit mehrschichtigem Kostenschutz

## Status

Angenommen — 2026-08-26 (Zusatzfeature nach dem 24-Tage-Plan, als „Multiplikator" abgestimmt).

## Kontext

Die Filtersuche steht seit Tag 6 (Textsuche, Steckertyp, Mindestleistung,
Betreiber, Status, synchron mit den URL-Query-Params). Eine Suche in freier
Sprache — „schneller CCS-Lader von Ionity, der funktioniert" — obendrauf ist
ein sichtbarer Kompetenz-Multiplikator für die Bewerbung, ohne die
bestehende Suche zu ersetzen.

Das braucht ein Sprachmodell, also eine externe, kostenpflichtige API. Zwei
Fragen entstehen daraus:

1. **Vertrauenswürdigkeit der Modellausgabe** — das Modell darf keine
   Betreiber-/Steckertyp-IDs erfinden, die es in den echten OCM-Daten nicht
   gibt.
2. **Kosten- und Missbrauchsgrenze** — ein öffentlicher Endpoint mit einem
   echten API-Key ist eine Kostenexposition. Ein Skript, das den Endpoint
   hämmert, oder ein Leak des Keys darf keine unbegrenzte Rechnung
   produzieren.

## Entscheidungen

### Claude Haiku mit strukturierter Ausgabe aus echten OCM-IDs

Modell `claude-haiku-4-5` (das günstigste), `max_tokens` eng begrenzt.
Das Zod-Ausgabeschema wird **zur Laufzeit aus den ID-Listen der gerade
geladenen Referenzdaten gebaut** (`idLiteralUnion` in `nl-search.ts`): eine
Union von Zahlen-Literalen, kein generisches `z.number()`. Das Modell kann
damit _nur_ eine ID zurückgeben, die real existiert (oder `null`) — die
Garantie kommt aus dem Schema selbst, nicht aus einer Prompt-Anweisung, die
das Modell ignorieren könnte. Der System-Prompt (mit der vollständigen
Betreiberliste) trägt `cache_control: ephemeral`, damit er nicht bei jeder
Query neu bezahlt wird; die Referenzdaten sind ohnehin 24 h gecached
(ADR-0002-Nachbarschaft, `defineCachedFunction` in `ocm-client.ts`).

### Optionales Feature, nicht im Boot-Pfad

`NUXT_ANTHROPIC_API_KEY` steht bewusst **nicht** in `validateEnv()` (anders
als `ocmApiKey`/`sessionPassword`). Fehlt der Key, antwortet der Endpoint
mit einem expliziten 503, die App bleibt mit der klassischen Filtersuche
voll benutzbar. Ein Deploy ohne diesen Key ist ein gültiger Zustand, kein
Fehler.

### Position bleibt außen vor

Lat/Lon/Radius werden **nicht** aus dem Text extrahiert: das ist bereits der
aktuelle Karten-/Filter-Store-Zustand (Tag 6–8). Die Sprachsuche fügt
Kriterien _über_ der aktuellen Ansicht hinzu, sie verschiebt sie nicht.
Ortsnamen aus Freitext geokodieren ist ein anderes Problem (braucht einen
eigenen Geocoding-Dienst) und ausdrücklich außerhalb des Scopes.

Dasselbe Prinzip auch für die übrigen Felder: das Ergebnis wird **mit** der
klassischen Filterleiste zusammengeführt (`useNlSearch`), nicht ersetzt. Nur
Felder, die die Query tatsächlich nennt, werden geschrieben; ein `null` heißt
„nicht erwähnt" und lässt den bestehenden Filterwert stehen. Eine Query nach
einem Betreiber überschreibt so kein von Hand gesetztes „min. 50 kW". Das ist
die weniger überraschende, umkehrbare Vorgabe — mit echter Nutzung neu zu
bewerten, wie der Tagesdeckel.

### Kostenschutz in Schichten

Keine der In-Prozess-Schichten ist eine harte Garantie — sie sorgen dafür,
dass normale Nutzung nie in die Nähe des Limits kommt und ein Skript früh
ausgebremst wird:

1. **Antwort-Cache** — kurze TTL (1 h), Key `countrycode:query`
   (`ttl-cache.ts`). Identische wiederholte Queries erreichen Claude nie
   erneut. Nur erfolgreiche Ergebnisse werden gecached, und der Cache wird
   als Erstes geprüft — ein Treffer verbraucht weder einen Rate-Limit- noch
   einen Tagesdeckel-Slot.
2. **Rate Limit pro IP** — 10/min, `createRateLimiter` wiederverwendet wie
   beim Login, aber nur beim echten Cache-Miss und **ohne** Reset bei
   Erfolg: eine erfolgreiche Suche hat echte (kleine) Kosten, also sollen
   Erfolge mitzählen (anders als beim Login-Tippfehler). Fängt den naiven
   Hammer von einem Client.
3. **Globaler Tagesdeckel** — ~200/Tag über **alle** Aufrufer zusammen
   (`nlSearchDailyCap`, ein Bucket mit konstantem Key). Begrenzt die
   Gesamtausgabe, wenn ein Angriff über viele IPs verteilt ist — was
   Schicht 2 strukturell nicht sieht.
4. **Die harte Obergrenze liegt beim Provider** — ein Spend-Limit auf einem
   **dedizierten Anthropic-Workspace**, der Key auf diesen Workspace
   gescoped, plus ein Rotations-Runbook (dokumentiert in `.env.example`).

Ehrlich zu den Grenzen: Schichten 1–3 sind In-Memory und pro
Prozess-Instanz (Serverless, ADR-0002/0003) — sie setzen bei jedem Cold
Start zurück, die reale Obergrenze ist N × Instanzen, nicht N. Sie sind
Schadensbegrenzer, keine Ausgabengarantie. Schicht 4 ist die Garantie.

## Warum nicht anders

- **Kein Auth-Gate vor dem Endpoint.** Der Login ist ein Mock (README) —
  eine Session-Pflicht wäre Reibung für legitime Nutzer:innen ohne echte
  Hürde für einen Angreifer.
- **Kein verteilter Limiter (Redis/KV).** Das gäbe eine echte harte Grenze
  über alle Instanzen, bedeutet aber ein echtes Backend — explizit
  außerhalb des Projekt-Scopes (ADR-0002/0003, [ADR-0003](0003-live-updates.md)).
- **Kein selbst gehostetes Modell.** Betrieb und Kosten stehen in keinem
  Verhältnis zu einem Portfolio-Zusatzfeature.

## Konsequenzen

- Die drei In-Memory-Wächter setzen bei Cold Start / pro Instanz zurück; das
  Spend-Limit auf dem Workspace ist, was die Rechnung real deckelt. Das ist
  ein bewusster Trade-off, kein übersehener Fall.
- Der Tagesdeckel (200) ist ein Startwert, gegen echte Nutzung zu justieren
  — dieselbe evidenzbasierte Methode wie bei den Lighthouse-Schwellen (Tag
  25/26), kein geratener Wert, der für immer steht.
- Eine 429 vom Tagesdeckel trägt `data.code: 'daily_cap'` und ist damit für
  Client-Code von einer per-IP-429 unterscheidbar — die UI kann gezielt auf
  die klassischen Filter verweisen.
- Ein reservierter Tagesdeckel-Slot wird zurückgegeben, wenn der Aufruf an
  einem Provider-Fehler scheitert (`Anthropic.APIError` → `upstream_error`,
  vom Provider abgelehnt, nicht abgerechnet). Ein kurzer Anthropic-Ausfall
  kann so nicht das ganze Tagesbudget leeren, ohne dass je eine Extraktion
  gelang. Ein `invalid_response` (verstümmelte/abgeschnittene Ausgabe) kann
  für die erzeugten Tokens berechnet worden sein — der Slot bleibt dort
  verbraucht.
- Der Antwort-Cache wird **vor** dem per-IP-Limiter geprüft: ein Cache-Treffer
  kostet nichts und zählt daher auch nicht gegen das Minutenbudget. Der
  per-IP-`reserve()` läuft nur beim echten Cache-Miss.
- Tests: die Fixed-Window-Primitive ist in `rate-limiter.test.ts` abgedeckt,
  der Cache in `ttl-cache.test.ts`. Der Endpoint-Pfad wird wie die anderen
  Routen live gegen einen echten Build verifiziert (curl / Playwright), nicht
  über Handler-Mocks.
