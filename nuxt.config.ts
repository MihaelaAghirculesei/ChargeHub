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
  }
})
