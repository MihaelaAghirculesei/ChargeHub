# ADR-0001: Design System (SCSS, semantische Palette, Dark Mode, Layout)

## Status

Angenommen — 2026-08-18.

## Kontext

Die Cubos-Stellenausschreibung verlangt explizit "sehr gute Kenntnisse in SCSS"
und dass der/die Kandidat/in aktiv an der "Designsprache" des Produkts
mitwirkt. Vuetify 3 deckt die Komponenten bereits ab; was hier zu bauen ist,
ist die Entscheidungsschicht, die sie mit der Domäne (Ladestationen) kohärent
und barrierefrei macht — kein Design System von Grund auf (siehe "Was NICHT
zu tun ist" im Plan).

Außerdem wird ein grundlegendes Anwendungslayout (Leiste, Navigation, Inhalt)
benötigt, bevor die echten Seiten (Stationen, Sitzungen usw.) in den
kommenden Tagen gebaut werden.

## Entscheidungen

### 1. Semantische Palette an die Domäne gebunden, nicht an Vuetify-Namen

Die vier Statusfarben eines Ladepunkts sind auf die _bestehenden_ semantischen
Rollen von Vuetify gemappt, statt eigene Ad-hoc-Farben einzuführen:

| Domänenstatus | Vuetify-Rolle     | Warum                                                                                         |
| ------------- | ----------------- | --------------------------------------------------------------------------------------------- |
| Verfügbar     | `success`         | Grün ist bereits die universelle Konvention für "ok, einsatzbereit".                          |
| Lädt          | `info`            | Aktiver/laufender Status, weder eine erfolgreiche Aktion noch ein Fehler.                     |
| Gestört       | `error`           | Nutzt die bestehende Fehler-Semantik statt eines separaten hartkodierten Rots.                |
| Offline       | `surface-variant` | Weder ein Fehler noch ein "aktiver" Status: ausgeschaltet, daher entsättigt statt eingefärbt. |

Praktischer Vorteil: Jede Vuetify-Komponente, die eine `color`-Prop akzeptiert
(`v-chip`, `v-icon`, `v-alert`, …), erbt diese Semantik automatisch, ohne dass
die Anwendungskomponenten Hex-Werte kennen müssen — konsistent mit der
Planregel "keine hartkodierten Farben in Komponenten". `app/pages/index.vue`
zeigt die vorgesehene Verwendung (Icon + Text, nie Farbe allein: bereits die
Grundlage für die Barrierefreiheits-Arbeit von Tag 18).

### 2. Kontrast geprüft, nicht angenommen

Jedes Farbe/Text-Paar (`success`/`on-success`, `info`/`on-info`, …) wurde mit
einem kleinen Node-Skript auf Basis der WCAG-2.1-Formel für relative
Leuchtdichte (`(L1+0.05)/(L2+0.05)`) geprüft, nicht der automatischen
Berechnung von Vuetify überlassen. Ergebnisse (Mindestanforderung: 4,5:1):

| Paar                                 | Light  | Dark   |
| ------------------------------------ | ------ | ------ |
| success / on-success                 | 5,35:1 | 7,28:1 |
| info / on-info                       | 5,29:1 | 8,49:1 |
| error / on-error                     | 5,62:1 | 6,86:1 |
| surface-variant / on-surface-variant | 6,52:1 | 7,02:1 |
| primary / on-primary                 | 6,34:1 | 7,51:1 |
| secondary / on-secondary             | 6,15:1 | 8,77:1 |

Alle Paare haben einen echten Puffer über der Schwelle (nicht 4,51:1 "auf den
letzten Drücker"), um auch bei kleinen künftigen Anpassungen der Palette
gültig zu bleiben. `on-background`/`on-surface` wurden nicht explizit
gesetzt: Vuetify berechnet sie automatisch als reines Schwarz/Weiß aus dem
Kontrast, was auf fast weißen (Light) bzw. fast schwarzen (Dark)
Hintergründen bereits am theoretischen Maximum liegt.

### 3. SCSS: System-Variablen in `_variables.scss` überschrieben

`app/assets/scss/_variables.scss` überschreibt die internen SASS-Variablen
von Vuetify (`@use 'vuetify/settings' with (...)`), nicht nur das JS-Theme:

- **System-Font-Stack** (`-apple-system, 'Segoe UI', Roboto, …`) statt eines
  heruntergeladenen Webfonts: keine Netzwerk-Requests, kein FOUT/CLS. Für ein
  internes Dashboard wiegt die Konsistenz mit dem Betriebssystem der
  Nutzer:innen mehr als eine gebrandete Schrift.
- **`$border-radius-root: 10px`** (Vuetify-Standard: 4px) — weichere visuelle
  Sprache für ein kartenbasiertes Dashboard, ohne bis zu "Pillenform" zu gehen.
- **`$spacer: 4px`** explizit gemacht (ist bereits der Standard), weil es die
  Basis ist, auf der alle in den Komponenten verwendeten `pa-*`/`ma-*`-
  Utilities aufbauen.

### 4. Dark Mode über `useCookie` persistiert, nicht `ssrClientHints`

`vuetify-nuxt-module` bietet einen eingebauten `ssrClientHints`-Mechanismus
für das Farbschema. Ich habe ihn nicht verwendet: Ausschreibung und Plan
verlangen explizit, die Persistenz mit `useCookie` "von Hand" zu
implementieren — die fertige Modul-Funktion zu nutzen hätte genau die
Kompetenz verdeckt, die dieser Tag zeigen soll. Außerdem ist ein Cookie für
eine explizite Nutzerwahl (soll das auch bleiben) semantisch etwas anderes
als ein Client Hint, der die Systempräferenz widerspiegelt.

Implementierung (`app/shared/composables/useAppTheme.ts` +
`app/plugins/vuetify-theme.ts`):

- Das Cookie `chargehub-theme` (`light`/`dark`, ein Jahr) ist die einzige
  Quelle der Wahrheit.
- Das Plugin liest das Cookie im Hook `vuetify:before-create` — **bevor**
  Vuetify die Theme-Instanz erstellt — sowohl server- als auch clientseitig,
  sodass das serverseitig gerenderte HTML und die Hydration mit demselben
  Theme starten: kein Flash beim Reload. Den Hook statt `useTheme()` im
  Plugin-Body zu nutzen vermeidet außerdem eine Abhängigkeit vom
  Vue-Setup-Kontext.
- `useAppTheme()` stellt `isDark`/`toggleTheme` für die UI bereit (der Button
  in der App-Bar) und schreibt sowohl auf das Live-Theme
  (`theme.global.name.value`) als auch auf das Cookie, sodass beide immer
  synchron bleiben.

### 5. Responsives Anwendungslayout

`app/layouts/default.vue`: `v-app-bar` (Titel + Theme-Umschalter) +
`v-navigation-drawer` + `v-main` mit einem `<slot />`. Der Drawer ist:

- `temporary` (Overlay) unterhalb des Vuetify-Mobile-Breakpoints, geöffnet
  über den Hamburger-Button in der App-Bar;
- `permanent` mit `rail`-Variante (Icons, erweitert sich bei Mausüberfahrt)
  ab Tablet-Größe — Standardmuster für Dashboards mit mehreren Bereichen.

Die Navigationseinträge für noch nicht gebaute Module (Stationen, Sitzungen,
Analytics, Tarife) sind vorhanden, aber `disabled` — um die geplante
Architektur (`app/modules/*`) ehrlich widerzuspiegeln, ohne auf noch nicht
existierende Routen zu verweisen.

## Technischer Hinweis: Dart-Sass-Bug unter Windows mit absoluten Pfaden

Während der Implementierung schlug `vuetify.moduleOptions.styles.configFile`
(der dokumentierte Weg, `_variables.scss` an die interne Kompilierung der
Vuetify-Komponenten anzubinden) mit `Can't find stylesheet to import.` fehl —
**nur unter Windows**. Ursache: `vuetify-nuxt-module` generiert intern
`@use '<absoluter Pfad>';` für die Konfigurationsdatei, aber Dart Sass unter
Windows interpretiert einen Pfad wie `C:/...` als URL mit dem Schema `"C"`
statt als absoluten Pfad — ein bekannter, noch offener Bug
([sass/dart-sass#1690](https://github.com/sass/dart-sass/issues/1690),
[vuetifyjs/vuetify-loader#300](https://github.com/vuetifyjs/vuetify-loader/issues/300)).
Isoliert reproduziert (außerhalb von Vite/Nuxt) mit `sass.compileString`:
schlägt sowohl mit dem nackten Pfad als auch mit einer korrekt formatierten
`file://`-URL fehl.

Gewählte Lösung in `nuxt.config.ts`: ein [custom Sass
Importer](https://sass-lang.com/documentation/js-api/interfaces/fileimporter/)
(`windowsSassImporter`), registriert über
`vite.css.preprocessorOptions.scss.importers`, der die Spezifier vor dem
Standard-Resolver abfängt und sie von Hand auf der Festplatte auflöst
(dabei wird auch die Sass-Partial-Konvention repliziert — `_name.scss` vor
`name.scss`, plus `_index.*`/`index.*` für Verzeichnisse — nötig, weil nach
Übernahme der Auflösung auch die internen relativen `@use`-Anweisungen des
`vuetify`-Pakets bis zum Ende gehandhabt werden müssen). Verworfene
Alternativen:

- **Projekt in einen Pfad ohne Leerzeichen verschieben**: löst das Problem
  nicht — der Bug reproduziert sich auch bei absoluten Pfaden ohne
  Leerzeichen.
- **`vuetify-nuxt-module` patchen**, damit es `file://` als Text statt des
  nackten Pfads generiert: reicht allein nicht, weil der Standard-Resolver
  von Dart Sass auch bei einer als Text geschriebenen `file://`-URL fehlschlägt.
- **Das Modul patchen, um native Windows-Backslashes auszugeben**
  (`C:\Users\...` mit `@use '...' as *;`): verworfen, nachdem dies einen
  noch subtileren Bug als den ursprünglichen **verursacht** hat — in
  SCSS-Strings ist ein Backslash gefolgt von Hexadezimalziffern ein gültiges
  CSS-_Unicode-Escape_, daher wurde `\Desktop` stillschweigend zu `Þsktop`
  umgeschrieben (`\De` → U+00DE), statt einen Auflösungsfehler zu werfen.
  Beweis im Repo: während der Entwicklung erschien der Fehler
  `The default namespace "UsersLGÞsktopProgetti privati\fhargeHub"`. Keine
  noch so ausgefeilte Logik im custom Sass Importer kann einen String
  wiederherstellen, der bereits vom Sass-Tokenizer korrumpiert wurde, bevor
  er überhaupt ankommt — daher die praktische Regel: **niemals rohe
  Backslashes in einem Sass-String**, nur `/` oder Pfade, die bereits durch
  `pathToFileURL` gelaufen sind.
- **`sass` statt `sass-embedded`**: pnpm installiert `sass-embedded`
  automatisch als optionale Peer-Dependency von `@vuetify/unplugin-styles`
  neu, und Vite bevorzugt es, wenn auflösbar; der custom Importer ist daher
  so geschrieben, dass er mit beiden funktioniert (behandelt sowohl
  nicht-codierte als auch percent-encoded Strings, wie sie von
  `sass-embedded` zurückgegeben werden).

Praktische Auswirkung: keine für die Entwicklung unter macOS/Linux (der
Importer lässt jeden Spezifier durch, der keinem absoluten Windows-Pfad
ähnelt). Unter Windows startet `pnpm dev` ohne diesen Importer nicht.

## Konsequenzen

- Einen neuen Stationsstatus künftig hinzuzufügen erfordert eine explizite
  Entscheidung, welche Vuetify-Rolle wiederverwendet wird (oder die
  wohlüberlegte Einführung einer neuen Rolle), nicht eine zufällige Farbe.
- Das Anwendungslayout ist bereit, die echten Seiten der kommenden Tage ohne
  weitere strukturelle Änderungen aufzunehmen.
- Die Kombination pnpm + Windows + Vuetify erfordert den custom Sass Importer
  in `nuxt.config.ts`: falls künftig `vuetify-nuxt-module` auf eine Version
  aktualisiert wird, die das Problem an der Wurzel löst, muss geprüft werden,
  ob der Importer noch nötig ist, bevor er entfernt wird. Kein Patch an
  `node_modules` ist nötig: der Importer arbeitet auf der originalen,
  unveränderten Ausgabe des Moduls.
