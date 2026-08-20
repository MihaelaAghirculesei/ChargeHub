# ADR-0004: Feature-first-Struktur (`app/modules/`), nicht nach Dateityp

## Status

Angenommen — 2026-08-18.

## Kontext

Nuxt schreibt keine Struktur für Anwendungscode vor, abgesehen von Ordnern
mit besonderer Bedeutung (`pages/`, `components/`, `composables/`,
`layouts/`, `server/`). Das Projekt hat sechs fachlich getrennte Bereiche
(Stationen, Sitzungen, Analytics, Tarife, Auth), jeder mit eigenem
Client-Repository, Store, Composables und Komponenten — die Frage ist, wie
man sie organisiert: nach **Dateityp** (`components/`, `composables/`,
`stores/` global, mit Namen, die alle mit `Station*`, `Session*`... beginnen)
oder nach **Feature**.

## Entscheidung

`app/modules/<feature>/` — jedes Modul ist ein kleiner, eigenständiger
vertikaler Schnitt:

```
app/modules/stations/
├── components/       # StationsMap.vue, StationsTable.vue, StationDetail.vue...
├── composables/       # useStations, useStation, useStationReferenceData
├── stores/             # stations.store.ts, stations-filters.store.ts
├── telemetry/          # transport.ts, polling-transport.ts (Tag 11)
├── repository.ts        # einziger Ort, der weiß, dass die Daten hinter /api/stations liegen
├── types.ts
└── index.ts             # Barrel: was das Modul nach außen bereitstellt
```

Die Seiten (`app/pages/stations/index.vue`, `[id].vue`) bleiben dünn: sie
setzen Modul-Komponenten zusammen, enthalten keine eigene Logik über
`definePageMeta`/`useSeoMeta` hinaus. Von mehreren Modulen gemeinsam
genutzter Code (lokale Formatierung, Theme) lebt in
`app/shared/composables/` — weder dupliziert noch vorschnell zu "Core"
befördert, bevor er wirklich von mindestens zwei Modulen geteilt wird.

## Warum nicht "nach Dateityp"

Bei sechs Features hätte eine Struktur nach Typ (`app/components/`,
`app/stores/`, `app/composables/`, alle flach) Ordner mit 20+ Dateien
erzeugt, nur nach Namenspräfix sortiert, in denen man erst alle Ordner
durchsuchen müsste, um zu verstehen "was gehört zum Stationen-Modul".
`app/modules/stations/` beantwortet das von selbst: es zu öffnen zeigt die
gesamte Oberfläche dieser Feature. Die echten Kosten liegen bei der
modulübergreifenden Suche ("wo verwende ich `useAuth`?") — abgefedert durch
die `index.ts`-Barrels (das Einzige, was für Imports von außen nötig ist)
und durch Import-Aliase (`~/modules/...`) statt langer relativer Pfade.

## Konsequenzen

- Ein zu groß werdendes Modul (Stationen hat Karte + Tabelle + Filter +
  Live-Telemetrie) bleibt trotzdem ein einziges Modul, es erzwingt keine
  künstliche Unterteilung nur um die Ordnergröße zu begrenzen.
- `shared/` ist für Code, der von **mindestens zwei** Modulen genutzt wird —
  eine explizite Regel, damit es nicht zum Sammelbecken für alles wird, wo
  man nicht weiß, wohin damit.
- Das Barrel (`index.ts`) jedes Moduls ist die öffentliche Oberfläche: ein
  Test oder ein anderes Modul importiert von dort, nicht aus einer
  spezifischen internen Datei — das erlaubt, das Innere eines Moduls zu
  refaktorieren, ohne dessen Konsumenten anzufassen.
