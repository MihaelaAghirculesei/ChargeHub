import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Dart Sass non risolve i percorsi assoluti Windows (`C:/...`) passati come
// specifier di `@use`/`@import`: il resolver di default li interpreta come
// URL con scheme "C" e fallisce con "Can't find stylesheet to import" (bug
// noto e ancora aperto, vedi sass/dart-sass#1690 e vuetifyjs/vuetify-loader#300).
// vuetify-nuxt-module genera esattamente un `@use` con percorso assoluto per
// `styles.configFile` (vedi `.nuxt/vuetify/vuetify.settings.scss`), quindi su
// Windows è del tutto rotto senza questo importer custom, che intercetta lo
// specifier prima del resolver di default e restituisce direttamente l'URL
// canonicalizzato — con sass-embedded (compilatore fuori processo, quello che
// questo progetto finisce per usare) lo specifier arriva già percent-encoded
// (es. spazi come `%20`), va quindi decodificato prima di ricostruire il path.
//
// Una volta che il nostro `_variables.scss` viene caricato tramite questo
// importer (quindi con un vero URL `file:`), anche i passi successivi della
// catena — il suo `@use 'vuetify/settings'` (lo specifier ufficiale
// documentato da Vuetify), i `@forward`/`@use` relativi interni al pacchetto
// `vuetify` verso cartelle con `_index.scss`, i file `.sass` (sintassi indent,
// non scss) — smettono di passare dal resolver di pacchetti di Vite e vanno
// gestiti qui: `resolveSassFile` replica la convenzione dei parziali Sass
// (`_nome.scss` prima di `nome.scss`, più `_index.*`/`index.*` per le
// directory) su un path assoluto reale.
// Dettagli in docs/adr/0001-design-system.md.
const require = createRequire(import.meta.url)

function resolveVuetifyPartial(specifier: string): string | null {
  const match = /^vuetify\/(.+)$/.exec(specifier)
  if (!match?.[1]) return null
  return join(dirname(require.resolve('vuetify/package.json')), match[1])
}

function resolveSassFile(rawPath: string): string | null {
  if (existsSync(rawPath)) {
    const stats = statSync(rawPath)
    if (stats.isFile()) return rawPath
    if (stats.isDirectory()) {
      return (
        ['_index.scss', 'index.scss', '_index.sass', 'index.sass']
          .map((name) => join(rawPath, name))
          .find(existsSync) ?? null
      )
    }
  }
  const dir = dirname(rawPath)
  const ext = extname(rawPath)
  const stem = ext ? basename(rawPath, ext) : basename(rawPath)
  for (const suffix of ['.scss', '.sass', '.css']) {
    for (const prefix of ['_', '']) {
      const candidate = join(dir, `${prefix}${stem}${suffix}`)
      if (existsSync(candidate)) return candidate
    }
  }
  return null
}

const windowsSassImporter = {
  canonicalize(url: string) {
    let rawPath: string | null
    if (/^[a-zA-Z]:[\\/]/.test(url)) rawPath = decodeURIComponent(url)
    else if (url.startsWith('file://')) rawPath = fileURLToPath(url)
    else rawPath = resolveVuetifyPartial(url)
    if (!rawPath) return null
    const resolved = resolveSassFile(rawPath)
    return resolved ? pathToFileURL(resolved) : null
  },
  load(canonicalUrl: URL) {
    const ext = extname(canonicalUrl.pathname)
    const syntax =
      ext === '.sass'
        ? ('indented' as const)
        : ext === '.css'
          ? ('css' as const)
          : ('scss' as const)
    return { contents: readFileSync(canonicalUrl, 'utf8'), syntax }
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['vuetify-nuxt-module', '@pinia/nuxt', '@vueuse/nuxt', '@nuxtjs/i18n', '@nuxt/eslint'],
  // Skip link + prefers-reduced-motion (Giorno 18): stili globali non legati
  // alle variabili Sass di Vuetify, quindi un CSS a parte da quello in
  // vuetify.moduleOptions.styles.configFile. mdi-subset.css (Giorno 24):
  // vedi il commento su vuetifyOptions.icons qui sotto. layout-shift-fix.css
  // (Giorno 25): vedi il commento nel file stesso.
  css: [
    '~/assets/css/accessibility.css',
    '~/assets/css/mdi-subset.css',
    '~/assets/css/layout-shift-fix.css'
  ],
  /**
   * Default globali (Giorno 24): ogni pagina imposta già il proprio titolo
   * via `useSeoMeta` (convenzione dal Giorno 1, "Nome pagina – ChargeHub"),
   * quindi nessun `titleTemplate` qui — si sommerebbe al suffisso già
   * scritto a mano in ogni pagina. `title`/`ogTitle`/`description` restano
   * come fallback per l'unico caso senza `useSeoMeta` proprio: l'error page
   * quando `error.vue` stesso non ha ancora fatto in tempo a impostarli
   * (percorsi di errore molto precoci, prima dell'idratazione).
   */
  app: {
    head: {
      title: 'ChargeHub',
      link: [
        // SVG prima del .ico: i browser che lo supportano lo preferiscono,
        // gli altri cadono da soli sul .ico servito per convenzione da
        // /favicon.ico anche senza un link esplicito.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        /**
         * Senza preload, il font viene scoperto solo dopo che il CSS
         * globale è stato scaricato E interpretato (la regola @font-face
         * vive in mdi-subset.css) — un terzo hop sequenziale nella catena
         * critica (HTML → CSS → font), trovato con l'audit
         * "network-dependency-tree-insight" di Lighthouse. Il preload lo fa
         * partire in parallelo al CSS invece che dopo. `crossorigin`
         * obbligatorio anche per un font stesso-origine (i font vengono
         * sempre richiesti in modalità CORS per spec): senza, il preload e
         * il fetch reale di @font-face non condividono la cache e il font
         * viene scaricato due volte.
         */
        {
          rel: 'preload',
          as: 'font',
          type: 'font/woff2',
          href: '/fonts/mdi-subset.woff2',
          crossorigin: 'anonymous'
        }
      ],
      meta: [
        { name: 'theme-color', content: '#2E4FE0' },
        {
          name: 'description',
          content:
            'Dashboard per infrastruttura di ricarica elettrica: stazioni, sessioni, analytics, tariffe.'
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'ChargeHub' },
        { property: 'og:image', content: '/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ]
    }
  },
  imports: {
    // Composable condivisi fuori da app/composables/ (struttura feature-first).
    dirs: ['shared/composables']
  },
  vuetify: {
    moduleOptions: {
      styles: {
        configFile: 'app/assets/scss/_variables.scss'
      }
    },
    vuetifyOptions: {
      /**
       * `false`, non lasciato al default (Giorno 24, dopo il primo run
       * reale della CI su un runner pulito): il default del modulo
       * (`@mdi/font` in locale, dato che è installato) inietta l'intera
       * foglio di stile MDI (~7000 icone, ~570 kB non compressi) come parte
       * del bundle critico che blocca il primo rendering — misurato da
       * Lighthouse, non stimato: FCP 11.5s, LCP 16.9s, Performance 46/100
       * su `/de/stations/47109`. `css` qui sopra carica invece
       * `mdi-subset.css`, generato a mano con solo le 76 icone davvero
       * usate (30 dall'app + quelle interne di Vuetify stesso — checkbox,
       * frecce, chiudi...) — stesse classi `.mdi`/`.mdi-xxx` di sempre,
       * zero componenti toccati. `icons: false` qui evita che il modulo
       * inietti *anche* la sua versione (locale o CDN) sopra alla nostra.
       */
      icons: false,
      theme: {
        defaultTheme: 'light',
        themes: {
          // Palette semantica: success = disponibile, info = in ricarica,
          // error = guasto, surface-variant = offline. Contrasto testo/sfondo
          // verificato ≥ 4.5:1 (WCAG 2.1 AA) per ogni coppia colore/on-colore,
          // vedi docs/adr/0001-design-system.md.
          light: {
            dark: false,
            colors: {
              background: '#F5F7FA',
              surface: '#FFFFFF',
              'surface-variant': '#E1E4EA',
              'on-surface-variant': '#4A4E5A',
              primary: '#2E4FE0',
              'on-primary': '#FFFFFF',
              secondary: '#55627A',
              'on-secondary': '#FFFFFF',
              success: '#157A4E',
              'on-success': '#FFFFFF',
              info: '#0072A8',
              'on-info': '#FFFFFF',
              error: '#C62828',
              'on-error': '#FFFFFF',
              warning: '#B25000',
              'on-warning': '#FFFFFF'
            }
          },
          dark: {
            dark: true,
            colors: {
              background: '#12151C',
              surface: '#1B1F29',
              'surface-variant': '#2B2F3B',
              'on-surface-variant': '#B7BCC8',
              primary: '#8CA0FF',
              'on-primary': '#0B1230',
              secondary: '#A9B4CC',
              'on-secondary': '#12151C',
              success: '#3FBE86',
              'on-success': '#062015',
              info: '#4FC1E9',
              'on-info': '#001C26',
              error: '#FF6B6B',
              'on-error': '#2B0000',
              warning: '#FFB74D',
              'on-warning': '#2B1500'
            }
          }
        }
      }
    }
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          importers: [windowsSassImporter]
        }
      }
    },
    /**
     * `cssCodeSplit: false` (Giorno 25, gate Lighthouse Performance su
     * /de/stations/47109): il default di Vite genera un file CSS per
     * componente Vuetify (VBtn, VCard, VList, VRow, ... 10 file da 300 B a
     * 4 kB ciascuno su questa sola pagina, ~15 kB totali) — ottimo per il
     * caching granulare, ma ogni file è una richiesta HTTP separata con un
     * costo fisso non trascurabile nella simulazione mobile di Lighthouse
     * (throttling "Slow 4G", ~150ms di round-trip stimato a richiesta).
     * Un solo CSS consolidato invece di 10+ non cambia in pratica i byte
     * totali (quei componenti servono comunque quasi ovunque nell'app) ma
     * elimina le richieste separate.
     */
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          /**
           * Solo `vuetify` in un chunk unico, non tutto (Giorno 25, stesso
           * gate Lighthouse): Vuetify genera ~15-20 file JS separati da
           * poche centinaia di byte a poche decine di kB per componente
           * (VBtn, VCard, VList, ...), usati su quasi ogni pagina di
           * quest'app — stesso ragionamento di `cssCodeSplit` qui sopra,
           * ogni file è un round-trip a parte nella simulazione mobile di
           * Lighthouse. `maplibre-gl` e Chart.js restano ESCLUSI e in
           * chunk separati/lazy (richiesto esplicitamente dal piano,
           * Giorno 21): entrano solo dietro import dinamico reale (mappa
           * al click, grafici sulla pagina analytics), non hanno senso nel
           * bundle "sempre caricato".
           */
          manualChunks(id) {
            if (id.includes('node_modules/vuetify/')) return 'vuetify'
          }
        }
      }
    }
  },
  runtimeConfig: {
    // Solo server: mai esposte al bundle client.
    ocmApiKey: '',
    // Chiave per sigillare (firmare + cifrare) il cookie di sessione, vedi
    // server/utils/auth-session.ts — nessuno store server-side (coerente col
    // vincolo serverless già seguito da ADR-0002/0003).
    sessionPassword: '',
    public: {
      appName: 'ChargeHub'
    }
  },
  typescript: {
    strict: true,
    typeCheck: false,
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true
      }
    }
  },
  i18n: {
    locales: [
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.ts' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.ts' }
    ],
    langDir: 'locales',
    defaultLocale: 'de',
    // Routing sempre prefissato per entrambe le lingue (/de/..., /en/...),
    // come richiesto dal piano — non "de senza prefisso, en con" di
    // prefix_except_default.
    strategy: 'prefix',
    // Niente redirect automatico in base all'Accept-Language del browser: il
    // tedesco resta il default deterministico ("Tedesco come lingua di
    // default", piano) finché l'utente non sceglie esplicitamente
    // dall'interfaccia — non a un rilevamento che varia da un browser
    // all'altro (e non è affatto deterministico in un ambiente di test).
    detectBrowserLanguage: false
  },
  eslint: {
    config: {
      typescript: {
        strict: true
      }
    }
  },
  /**
   * Rendering ibrido per rotta (Giorno 21), non un solo modo per tutta
   * l'app:
   * - `/login`: nessun dato per-richiesta (il form parte sempre vuoto, il
   *   redirect "già loggato" e quello dopo il login girano lato client via
   *   `useAuth()`/query string, non nell'HTML) — l'unica pagina di questa
   *   app che qualifica davvero come "landing" statica, `prerender: true`.
   * - `/` (dashboard): KPI derivati da OCM + simulatori (Giorno 10-13), mai
   *   davvero statici né utili da servire pre-renderizzati identici a ogni
   *   visitatore — client-side puro (`ssr: false`), come richiesto dal
   *   piano.
   * - `/stations/*` (dettaglio stazione, non la lista): SSR resta essenziale
   *   ("Fatto quando" del Giorno 9, contenuto completo nella prima risposta,
   *   non solo dopo l'idratazione).
   *
   * Provato anche `swr` (stale-while-revalidate/ISR) su `/stations/*`, per
   * evitare di ricalcolare da zero dati OCM che non cambiano a ogni
   * richiesta — **tolto**: rompe l'idratazione client, sia in `pnpm dev`
   * che nella build di produzione. Con `swr` attivo, il client tenta di
   * caricare un `/_payload.json` di supporto (pensato per prerender/ISR)
   * che qui non viene generato (404, `[NUXT_E7002]`), Vue non riesce a
   * riconciliare l'HTML SSR con quello atteso ("Hydration node mismatch")
   * e il contenuto della pagina sparisce subito dopo il primo paint — un
   * bug reale che romperebbe la pagina per ogni visitatore vero, trovato
   * solo verificando con un browser reale (curl vede l'HTML SSR iniziale,
   * corretto, e basta) e confermato identico sia in dev sia in build di
   * produzione. Da rivedere se questa combinazione Nuxt/Nitro cambia.
   */
  routeRules: {
    '/de/login': { prerender: true },
    '/en/login': { prerender: true },
    '/de': { ssr: false },
    '/en': { ssr: false },
    /**
     * `public/fonts/mdi-subset.woff2` (Giorno 25) non ha un nome
     * content-hashato come gli asset in `_nuxt/*` — Nitro non gli applica
     * da solo il `Cache-Control: max-age=31536000, immutable` che dà agli
     * asset di build. Trovato con l'audit "cache-insight" di Lighthouse:
     * `Cache TTL: 0`, riscaricato ad ogni navigazione. Il contenuto cambia
     * solo se qualcuno rigenera il sottoinsieme di icone a mano (vedi
     * `mdi-subset.css`) — un evento raro e deliberato, non qualcosa che
     * deve invalidare la cache di ogni visitatore automaticamente.
     */
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } }
  },
  /**
   * `compressPublicAssets: true` (Giorno 25, gate Lighthouse Performance su
   * /de/stations/47109): senza, `node .output/server/index.mjs` — lo stesso
   * comando usato dal job Lighthouse in CI — non comprime nulla, verificato
   * con `curl -H "Accept-Encoding: gzip, br"`: nessun `Content-Encoding`,
   * byte grezzi identici al Content-Length. Il piano richiede esplicitamente
   * "bundle iniziale sotto i 300 kB gzip" — 884 kB di JS+CSS critico
   * trasferiti SENZA compressione (misurato con l'audit "network-requests"
   * di Lighthouse) rendevano quel target irraggiungibile a prescindere da
   * quanto altro si tagliasse. Pre-comprime gzip+brotli in fase di build
   * gli asset statici in `.output/public` (JS/CSS/font, non l'HTML
   * renderizzato per richiesta); Nitro serve la variante compressa quando
   * il client la accetta.
   */
  nitro: {
    compressPublicAssets: true
  }
})
