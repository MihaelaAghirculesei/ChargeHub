# ADR-0006: Hybrides Rendering pro Route — nicht eine einzige Art für die ganze App

## Status

Angenommen — 2026-08-19 (Tag 21), mit einem unten dokumentierten verworfenen Versuch.

## Kontext

Nuxt rendert jede Seite standardmäßig serverseitig. Nicht alle Seiten dieser
App haben dasselbe Profil: das Stationsdetail hat Daten, die sich selten
ändern, und profitiert von vollständigem SSR beim ersten Paint (Tag 9); das
Dashboard zeigt KPIs, abgeleitet aus OCM + Simulatoren, nie wirklich
statisch noch für zwei Besucher:innen identisch; der Login hat keinerlei
Pro-Request-Daten im HTML.

## Entscheidungen

### `routeRules` pro Route, kein globaler Standard

- `/login`: `{ prerender: true }` — die einzige Seite dieser App ohne
  jegliche Pro-Request-Daten im HTML (der Redirect "bereits eingeloggt" und
  der nach dem Login laufen clientseitig über `useAuth()`/Query-String, nicht
  im Markup).
- `/` (Dashboard): `{ ssr: false }` — rein clientseitig. KPIs, abgeleitet aus
  OCM + Simulatoren, nie statisch noch sinnvoll für jede:n Besucher:in
  identisch vorzurendern.
- Stationsdetail (`/stations/:id`): SSR als Standard, unverändert — bleibt
  essenziell für das "Fertig, wenn" von Tag 9 (vollständiger Inhalt in der
  ersten Antwort, nicht erst nach der Hydration).

### Versucht und verworfen: `swr` auf dem Stationsdetail

Um zu vermeiden, dass OCM-Daten, die sich nicht bei jedem Request ändern,
neu berechnet werden, war der naheliegende Versuch `swr: 300`
(stale-while-revalidate/ISR) auf der Detail-Route. **Kaputt**, verifiziert
mit einem echten Browser sowohl in `pnpm dev` als auch im Produktions-Build:
mit aktiviertem `swr` versucht der Client, eine unterstützende
`/_payload.json` zu laden (gedacht für Prerender/ISR), die mit `swr` allein
nicht generiert wird — 404, dann `[Vue warn]: Hydration node mismatch`, und
der Seiteninhalt verschwindet direkt nach dem ersten Paint. Ein `curl` sieht
nur das anfängliche SSR-HTML (korrekt) und endet dort, blind gegenüber allem,
was danach während der Hydration passiert — ein Bug, den `curl` allein nie
hätte aufdecken können, und der die Seite für jede:n echte:n Besucher:in
kaputt gemacht hätte, wäre er nicht vor dem Release gefunden worden.

**Entfernt.** Das Stationsdetail bleibt reines SSR, ohne zusätzliches
anwendungsseitiges Caching über das hinaus, was Nitro/das CDN bereits
standardmäßig für nicht explizit markierte Antworten bereitstellen. Bei
einer künftigen Version, die das Verhalten dieser Nuxt/Nitro-Kombination
ändert, erneut zu prüfen.

## Warum nicht eine einzige Art für die ganze App

Ein einheitlicher Standard (alles SSR oder alles clientseitig) hätte entweder
das "Fertig, wenn" von Tag 9 (vollständiger SSR-Inhalt für das
Stationsdetail) oder die Einfachheit des Dashboards geopfert (das kein SSR
für bei jedem Besuch wechselnde Daten braucht). Nitros `routeRules` macht
diese Pro-Route-Entscheidung an einer einzigen Stelle explizit
(`nuxt.config.ts`), nicht verstreut über `definePageMeta` verschiedener
Seiten.

## Konsequenzen

- Das Dashboard benachteiligt, weil clientseitig, konstruktionsbedingt die
  Lighthouse-Metriken rund um den ersten Paint (FCP/LCP) gegenüber einer
  gleichwertigen SSR-Seite — eine bewusste Entscheidung, keine zu
  verfolgende Regression. Das Lighthouse-Gate in der CI (Tag 22) scannt
  deshalb das Stationsdetail (SSR), nicht das Dashboard.
- Aktuell kein anwendungsseitiges HTTP-Caching (`swr`/ISR) auf dem
  Stationsdetail — jeder Request holt die Daten erneut von OCM. Sollte das
  Verkehrsvolumen es rechtfertigen, ist der richtige Weg herauszufinden,
  warum die Payload-Extraktion mit `swr` in dieser Nuxt/Nitro-Version
  fehlschlägt, nicht dasselbe `swr` erneut zu versuchen in der Hoffnung auf
  ein anderes Ergebnis.
