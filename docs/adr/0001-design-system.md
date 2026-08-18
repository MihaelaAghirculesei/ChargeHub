# ADR-0001: Design system (SCSS, palette semantica, dark mode, layout)

## Stato

Accettato — 2026-08-18.

## Contesto

L'annuncio Cubos chiede esplicitamente "sehr gute Kenntnisse in SCSS" e che il/la
candidato/a contribuisca attivamente alla "Designsprache" del prodotto. Vuetify 3
copre già i componenti; quello che va costruito qui è lo strato di decisioni che
li rende coerenti con il dominio (stazioni di ricarica) e accessibili, non un
design system da zero (vedi "Cosa NON fare" nel piano).

Serve inoltre un layout applicativo di base (barra, navigazione, contenuto)
prima che le pagine reali (stazioni, sessioni, ecc.) vengano costruite nei
prossimi giorni.

## Decisioni

### 1. Palette semantica legata al dominio, non ai nomi Vuetify

I quattro colori di stato di un punto di ricarica sono mappati sui ruoli
semantici *esistenti* di Vuetify invece di introdurre colori custom ad-hoc:

| Stato dominio | Ruolo Vuetify     | Perché                                                              |
| -------------- | ----------------- | -------------------------------------------------------------------- |
| Disponibile    | `success`         | Verde è già la convenzione universale per "ok, pronto all'uso".      |
| In ricarica    | `info`            | Stato attivo/in corso, non un'azione riuscita né un errore.          |
| Guasto         | `error`           | Riusa la semantica di errore invece di un rosso hardcoded a parte.   |
| Offline        | `surface-variant` | Non è un errore né uno stato "attivo": è spento, quindi va desaturato invece che colorato. |

Vantaggio pratico: qualunque componente Vuetify che accetta una `color` prop
(`v-chip`, `v-icon`, `v-alert`, …) eredita automaticamente questa semantica
senza che i componenti applicativi debbano conoscere i valori esadecimali —
coerente con la regola del piano "nessun colore hardcoded nei componenti".
`app/pages/index.vue` mostra l'uso previsto (icona + testo, mai il solo colore:
è già la base per il lavoro di accessibilità del Giorno 18).

### 2. Contrasto verificato, non assunto

Ogni coppia colore/testo (`success`/`on-success`, `info`/`on-info`, …) è stata
verificata con un piccolo script Node basato sulla formula di luminanza
relativa WCAG 2.1 (`(L1+0.05)/(L2+0.05)`), non lasciata al calcolo automatico
di Vuetify. Risultati (minimo richiesto: 4.5:1):

| Coppia                       | Light   | Dark    |
| ----------------------------- | ------- | ------- |
| success / on-success          | 5.35:1  | 7.28:1  |
| info / on-info                | 5.29:1  | 8.49:1  |
| error / on-error              | 5.62:1  | 6.86:1  |
| surface-variant / on-surface-variant | 6.52:1 | 7.02:1 |
| primary / on-primary          | 6.34:1  | 7.51:1  |
| secondary / on-secondary      | 6.15:1  | 8.77:1  |

Tutte le coppie hanno un margine reale sopra la soglia (non 4.51:1 "per un
pelo"), per restare valide anche a piccoli aggiustamenti futuri della palette.
`on-background`/`on-surface` non sono stati fissati esplicitamente: Vuetify li
calcola automaticamente in nero/bianco puro dal contrasto, che su sfondi quasi
bianchi (light) o quasi neri (dark) è già al massimo teorico.

### 3. SCSS: variabili di sistema sovrascritte in `_variables.scss`

`app/assets/scss/_variables.scss` sovrascrive le SASS variable interne di
Vuetify (`@use 'vuetify/settings' with (...)`), non solo il tema JS:

- **Font-stack di sistema** (`-apple-system, 'Segoe UI', Roboto, …`) invece di
  un webfont scaricato: zero richieste di rete, zero FOUT/CLS. Per una
  dashboard interna la coerenza col sistema operativo dell'utente pesa più di
  un font brandizzato.
- **`$border-radius-root: 10px`** (default Vuetify: 4px) — linguaggio visivo
  più morbido per una dashboard basata su card, senza arrivare a forme "a
  pillola".
- **`$spacer: 4px`** reso esplicito (è già il default) perché è la base su cui
  ragionano tutte le utility `pa-*`/`ma-*` usate nei componenti.

### 4. Dark mode persistito via `useCookie`, non `ssrClientHints`

`vuetify-nuxt-module` offre un meccanismo `ssrClientHints` integrato per il
color scheme. Non l'ho usato: l'annuncio e il piano chiedono esplicitamente di
saper implementare la persistenza con `useCookie` "a mano" — usare la feature
già pronta del modulo avrebbe nascosto esattamente la competenza che questo
giorno deve dimostrare, oltre a un cookie di scelta esplicita dell'utente
(pensato per restare tale) essendo semanticamente diverso da un client hint
che riflette la preferenza del sistema operativo.

Implementazione (`app/shared/composables/useAppTheme.ts` +
`app/plugins/vuetify-theme.ts`):

- Il cookie `chargehub-theme` (`light`/`dark`, un anno) è l'unica fonte di
  verità.
- Il plugin legge il cookie nell'hook `vuetify:before-create` — **prima**
  che Vuetify crei l'istanza del tema — sia lato server che lato client, così
  l'HTML renderizzato in SSR e l'hydration partono già dallo stesso tema:
  nessun flash al reload. Usare l'hook invece di `useTheme()` nel corpo del
  plugin evita anche una dipendenza dal contesto di setup di Vue.
- `useAppTheme()` espone `isDark`/`toggleTheme` per l'UI (il pulsante
  nell'app bar) e scrive sia sul tema live (`theme.global.name.value`) sia sul
  cookie, cosi restano sempre sincronizzati.

### 5. Layout applicativo responsive

`app/layouts/default.vue`: `v-app-bar` (titolo + toggle tema) +
`v-navigation-drawer` + `v-main` con uno `<slot />`. Il drawer è:

- `temporary` (overlay) sotto il breakpoint mobile di Vuetify, aperto dal
  pulsante hamburger nell'app bar;
- `permanent` con variante `rail` (icone, si espande al passaggio del mouse)
  da tablet in su — pattern standard per dashboard con più sezioni.

Le voci di navigazione per i moduli non ancora costruiti (stazioni, sessioni,
analytics, tariffe) sono presenti ma `disabled`, per riflettere onestamente
l'architettura pianificata (`app/modules/*`) senza puntare a rotte che non
esistono ancora.

## Nota tecnica: bug Dart Sass su Windows con percorsi assoluti

Durante l'implementazione, `vuetify.moduleOptions.styles.configFile` (il modo
documentato per agganciare `_variables.scss` alla compilazione interna dei
componenti Vuetify) falliva con `Can't find stylesheet to import.` **solo su
Windows**. Causa: `vuetify-nuxt-module` genera internamente
`@use '<percorso assoluto>';` per il file di configurazione, ma Dart Sass su
Windows interpreta un percorso `C:/...` come URL con scheme `"C"` invece che
come percorso assoluto — bug noto e ancora aperto
([sass/dart-sass#1690](https://github.com/sass/dart-sass/issues/1690),
[vuetifyjs/vuetify-loader#300](https://github.com/vuetifyjs/vuetify-loader/issues/300)).
Riprodotto in isolamento (fuori da Vite/Nuxt) con `sass.compileString`: fallisce
sia con il percorso nudo sia con un URL `file://` correttamente formato.

Soluzione adottata in `nuxt.config.ts`: un [importer Sass
custom](https://sass-lang.com/documentation/js-api/interfaces/fileimporter/)
(`windowsSassImporter`) registrato via
`vite.css.preprocessorOptions.scss.importers`, che intercetta gli specifier
prima del resolver di default e li risolve a mano su disco (replicando anche
la convenzione dei parziali Sass — `_nome.scss` prima di `nome.scss`, più
`_index.*`/`index.*` per le directory — necessaria perché una volta preso il
controllo della risoluzione, va gestita fino in fondo anche per gli `@use`
relativi interni al pacchetto `vuetify`). Alternative scartate:

- **Spostare il progetto in un percorso senza spazi**: non risolve — il bug
  si riproduce anche su percorsi assoluti senza spazi.
- **Patchare `vuetify-nuxt-module`** perché generi `file://` testuale invece
  del percorso nudo: da solo non basta, perché il resolver di default di
  Dart Sass fallisce anche su un `file://` scritto come testo.
- **Patchare il modulo per emettere backslash Windows nativi** (`C:\Users\...`
  con `@use '...' as *;`): scartata dopo aver **causato** un bug più subdolo
  del bug originale — nelle stringhe SCSS un backslash seguito da cifre
  esadecimali è una *unicode escape* CSS valida, quindi `\Desktop` veniva
  silenziosamente riscritto in `Þsktop` (`\De` → U+00DE) invece di dare un
  errore di risoluzione. Prova del repo: durante lo sviluppo è comparso
  l'errore `The default namespace "UsersLGÞsktopProgetti privati\fhargeHub"`.
  Nessuna quantità di logica nell'importer Sass custom può recuperare una
  stringa già corrotta dal tokenizer di Sass prima ancora di arrivarci — da
  qui la regola pratica: **mai backslash grezzi dentro una stringa Sass**,
  solo `/` o path già passati per `pathToFileURL`.
- **`sass` invece di `sass-embedded`**: pnpm reinstalla `sass-embedded` in
  automatico come peer opzionale di `@vuetify/unplugin-styles`, e Vite lo
  preferisce se risolvibile; l'importer custom è quindi scritto per
  funzionare con entrambi (gestisce sia stringhe non codificate sia
  percent-encoded, come restituite da `sass-embedded`).

Impatto pratico: nessuno per lo sviluppo su macOS/Linux (l'importer si limita
a lasciar passare qualunque specifier che non somigli a un percorso assoluto
Windows). Su Windows, senza questo importer, `pnpm dev` non parte.

## Conseguenze

- Aggiungere un nuovo stato di stazione in futuro richiede una scelta
  esplicita di quale ruolo Vuetify riusare (o l'introduzione ponderata di un
  nuovo ruolo), non un colore a caso.
- Il layout applicativo è pronto per ospitare le pagine reali dei prossimi
  giorni senza ulteriori modifiche strutturali.
- La combinazione pnpm + Windows + Vuetify richiede l'importer Sass custom in
  `nuxt.config.ts`: se in futuro si aggiorna `vuetify-nuxt-module` a una
  versione che risolve il problema a monte, va verificato se l'importer è
  ancora necessario prima di rimuoverlo. Nessuna patch a `node_modules` è
  necessaria: l'importer funziona sull'output originale, non modificato, del
  modulo.
