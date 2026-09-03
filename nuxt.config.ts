import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Dart Sass does not resolve Windows absolute paths (`C:/...`) passed as
// `@use`/`@import` specifiers: the default resolver reads them as URLs with
// scheme "C" and fails with "Can't find stylesheet to import" (a known, still
// open bug — see sass/dart-sass#1690 and vuetifyjs/vuetify-loader#300).
// vuetify-nuxt-module generates exactly one `@use` with an absolute path for
// `styles.configFile` (see `.nuxt/vuetify/vuetify.settings.scss`), so on
// Windows it is completely broken without this custom importer, which
// intercepts the specifier before the default resolver and returns the
// canonicalized URL directly — with sass-embedded (out-of-process compiler,
// the one this project ends up using) the specifier arrives already
// percent-encoded (e.g. spaces as `%20`), so it must be decoded before
// rebuilding the path.
//
// Once our `_variables.scss` is loaded through this importer (so with a real
// `file:` URL), the later steps of the chain — its `@use 'vuetify/settings'`
// (the official specifier documented by Vuetify), the relative `@forward`/
// `@use` internal to the `vuetify` package pointing at folders with
// `_index.scss`, the `.sass` files (indented syntax, not scss) — also stop
// going through Vite's package resolver and must be handled here:
// `resolveSassFile` replicates the Sass partials convention (`_name.scss`
// before `name.scss`, plus `_index.*`/`index.*` for directories) against a
// real absolute path.
// Details in docs/adr/0001-design-system.md.
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
  // Skip link + prefers-reduced-motion (Day 18): global styles not tied to
  // Vuetify's Sass variables, so a CSS file separate from the one in
  // vuetify.moduleOptions.styles.configFile. mdi-subset.css (Day 24): see the
  // comment on vuetifyOptions.icons below. layout-shift-fix.css (Day 25): see
  // the comment in the file itself.
  css: [
    '~/assets/css/accessibility.css',
    '~/assets/css/mdi-subset.css',
    '~/assets/css/layout-shift-fix.css'
  ],
  /**
   * Global defaults (Day 24): every page already sets its own title via
   * `useSeoMeta` (convention since Day 1, "Page name – ChargeHub"), so no
   * `titleTemplate` here — it would stack on top of the suffix already
   * written by hand in each page. `title`/`ogTitle`/`description` stay as a
   * fallback for the one case with no `useSeoMeta` of its own: the error page
   * when `error.vue` itself has not had time to set them yet (very early
   * error paths, before hydration).
   */
  app: {
    head: {
      title: 'ChargeHub',
      link: [
        // SVG before the .ico: browsers that support it prefer it, the others
        // fall back on their own to the .ico served by convention from
        // /favicon.ico even without an explicit link.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon.ico' },
        /**
         * Without preload, the font is only discovered after the global CSS
         * has been downloaded AND parsed (the @font-face rule lives in
         * mdi-subset.css) — a third sequential hop in the critical chain
         * (HTML → CSS → font), found with Lighthouse's
         * "network-dependency-tree-insight" audit. The preload starts it in
         * parallel with the CSS instead of after it. `crossorigin` is
         * mandatory even for a same-origin font (fonts are always requested
         * in CORS mode per spec): without it, the preload and the real
         * @font-face fetch do not share the cache and the font is downloaded
         * twice.
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
            'Dashboard für Ladeinfrastruktur für Elektrofahrzeuge: Stationen, Sitzungen, Analytics, Tarife.'
        },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'ChargeHub' },
        { property: 'og:image', content: '/og-image.png' },
        { name: 'twitter:card', content: 'summary_large_image' }
      ]
    }
  },
  imports: {
    // Shared composables outside app/composables/ (feature-first structure).
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
       * `false`, not left at the default (Day 24, after the first real CI
       * run on a clean runner): the module's default (`@mdi/font` locally,
       * since it is installed) injects the entire MDI stylesheet (~7000
       * icons, ~570 kB uncompressed) as part of the critical bundle that
       * blocks the first render — measured by Lighthouse, not estimated: FCP
       * 11.5s, LCP 16.9s, Performance 46/100 on `/de/stations/47109`. `css`
       * above loads `mdi-subset.css` instead, generated by hand with only
       * the 76 icons actually used (30 from the app + Vuetify's own internal
       * ones — checkbox, arrows, close...) — same `.mdi`/`.mdi-xxx` classes
       * as always, zero components touched. `icons: false` here stops the
       * module from injecting *its* version (local or CDN) on top of ours.
       */
      icons: false,
      theme: {
        defaultTheme: 'light',
        themes: {
          // Semantic palette: success = available, info = charging, error =
          // faulted, surface-variant = offline. Text/background contrast
          // verified >= 4.5:1 (WCAG 2.1 AA) for every color/on-color pair,
          // see docs/adr/0001-design-system.md.
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
    /**
     * Silences the dev-server half of the `maplibre-gl-worker.mjs` 404
     * (found 25/08 while verifying the security-headers change against a
     * real production build — see `app/modules/stations/maplibre.ts` for
     * the actual production fix and the full root cause). Without this,
     * `pnpm dev` logs "The file does not exist at
     * .../maplibre-gl-worker.mjs ... Try adding it to
     * optimizeDeps.exclude" on every reload that touches the map (seen
     * throughout this whole project): Vite's dev-only dependency
     * pre-bundler flattens `maplibre-gl` into a single file and tries,
     * and fails, to also probe its sibling worker file relative to that
     * flattened location. Excluding it here stops the probe/warning in
     * dev. This alone does NOT fix the production 404 — `optimizeDeps` is
     * a dev-server-only concept, Rollup's production build never runs it.
     */
    optimizeDeps: {
      exclude: ['maplibre-gl']
    },
    css: {
      preprocessorOptions: {
        scss: {
          importers: [windowsSassImporter]
        }
      }
    },
    /**
     * `cssCodeSplit: false` (Day 25, Lighthouse Performance gate on
     * /de/stations/47109): Vite's default generates one CSS file per Vuetify
     * component (VBtn, VCard, VList, VRow, ... 10 files from 300 B to 4 kB
     * each on this page alone, ~15 kB total) — great for granular caching,
     * but each file is a separate HTTP request with a fixed cost that is not
     * negligible in Lighthouse's mobile simulation ("Slow 4G" throttling,
     * ~150ms estimated round-trip per request). A single consolidated CSS
     * instead of 10+ does not change total bytes in practice (those
     * components are needed almost everywhere in the app anyway) but removes
     * the separate requests.
     */
    build: {
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          /**
           * Only `vuetify` in a single chunk, not everything (Day 25, same
           * Lighthouse gate): Vuetify generates ~15-20 separate JS files
           * from a few hundred bytes to a few tens of kB per component
           * (VBtn, VCard, VList, ...), used on almost every page of this
           * app — same reasoning as `cssCodeSplit` above, each file is a
           * separate round-trip in Lighthouse's mobile simulation.
           * `maplibre-gl` and Chart.js stay EXCLUDED and in separate/lazy
           * chunks (explicitly required by the plan, Day 21): they only
           * come in behind a real dynamic import (map on click, charts on
           * the analytics page), they have no place in the "always loaded"
           * bundle.
           */
          manualChunks(id) {
            if (id.includes('node_modules/vuetify/')) return 'vuetify'
          }
        }
      }
    }
  },
  runtimeConfig: {
    // Server only: never exposed to the client bundle.
    ocmApiKey: '',
    // Key to seal (sign + encrypt) the session cookie, see
    // server/utils/auth-session.ts — no server-side store (consistent with
    // the serverless constraint already followed by ADR-0002/0003).
    sessionPassword: '',
    // Natural-language station search (ADR-0007) — unlike ocmApiKey/
    // sessionPassword, NOT in validateEnv(): it is an optional feature on top
    // of the already-working app, not a boot requirement. Without this key
    // the endpoint responds with an explicit 503 and the app stays usable
    // with the normal filter search.
    anthropicApiKey: '',
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
    // Routing always prefixed for both languages (/de/..., /en/...), as
    // required by the plan — not "de without prefix, en with" of
    // prefix_except_default.
    strategy: 'prefix',
    // No automatic redirect based on the browser's Accept-Language: German
    // stays the deterministic default ("German as the default language",
    // plan) until the user explicitly picks from the UI — not a detection
    // that varies from one browser to another (and is not deterministic at
    // all in a test environment).
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
   * Hybrid rendering per route (Day 21), not a single mode for the whole
   * app:
   * - `/login`: no per-request data (the form always starts empty, the
   *   "already logged in" redirect and the post-login one run client-side
   *   via `useAuth()`/query string, not in the HTML) — the one page of this
   *   app that truly qualifies as a static "landing", `prerender: true`.
   * - `/` (dashboard): KPIs derived from OCM + simulators (Day 10-13), never
   *   really static nor useful to serve pre-rendered identically to every
   *   visitor — pure client-side (`ssr: false`), as required by the plan.
   * - `/stations/*` (station detail, not the list): SSR stays essential
   *   ("Done when" of Day 9, full content in the first response, not only
   *   after hydration).
   *
   * Also tried `swr` (stale-while-revalidate/ISR) on `/stations/*`, to avoid
   * recomputing OCM data from scratch when it does not change on every
   * request — **removed**: it breaks client hydration, both in `pnpm dev`
   * and in the production build. With `swr` active, the client tries to load
   * a supporting `/_payload.json` (meant for prerender/ISR) that is not
   * generated here (404, `[NUXT_E7002]`), Vue cannot reconcile the SSR HTML
   * with the expected one ("Hydration node mismatch") and the page content
   * disappears right after the first paint — a real bug that would break the
   * page for every real visitor, found only by checking with a real browser
   * (curl sees the initial SSR HTML, correct, and nothing more) and
   * confirmed identical in both dev and production build. Revisit if this
   * Nuxt/Nitro combination changes.
   */
  routeRules: {
    '/de/login': { prerender: true },
    '/en/login': { prerender: true },
    '/de': { ssr: false },
    '/en': { ssr: false },
    /**
     * `public/fonts/mdi-subset.woff2` (Day 25) does not have a
     * content-hashed name like the assets in `_nuxt/*` — Nitro does not
     * apply the `Cache-Control: max-age=31536000, immutable` it gives build
     * assets to it on its own. Found with Lighthouse's "cache-insight"
     * audit: `Cache TTL: 0`, re-downloaded on every navigation. The content
     * only changes if someone regenerates the icon subset by hand (see
     * `mdi-subset.css`) — a rare, deliberate event, not something that
     * should invalidate every visitor's cache automatically.
     */
    '/fonts/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    /**
     * Baseline security headers (backlog item #2, 25/08 — see
     * docs/PROGRESS.md), applied to every route including `/api/**`.
     *
     * CSP is the only non-trivial one. `script-src`/`style-src` need
     * `'unsafe-inline'`: Nuxt embeds the SSR hydration payload
     * (`window.__NUXT__ = ...`) as an inline `<script>` on every
     * server-rendered route, and Vuetify injects inline `<style>` for
     * per-component dynamic sizing/theming — neither goes through a
     * nonce here (a nonce-based CSP is a real project on its own, out of
     * scope for "basic" headers). This is a known, documented trade-off:
     * still blocks arbitrary *external* script/style/image/font/connect
     * injection, which is the actual threat this closes off.
     * `https://tile.openstreetmap.org` (the only third-party resource the
     * app loads client-side, see `StationsMapCanvas.vue`) is listed under
     * BOTH `img-src` and `connect-src`, not just `img-src` as the raster
     * tiles' visual role would suggest: MapLibre GL fetches tiles via
     * `fetch()` internally (for retry/error handling), and browsers gate
     * `fetch()`-loaded resources on `connect-src` regardless of what the
     * response bytes are eventually used for. Missing this broke the map
     * outright in a first pass — caught by an actual browser run against
     * the production build (`node .output/server/index.mjs`) with full,
     * untruncated console capture; the full `pnpm test:e2e` run right
     * before it looked clean, but that was a false negative from piping
     * its own output through `tail` before saving it, not a real dev/prod
     * difference — headers apply identically in both. `data:` in
     * `img-src` covers Chart.js/MapLibre internal data URIs. `worker-src
     * blob:` is required by MapLibre GL's internal tile-parsing Web
     * Worker (spun up from a `blob:` URL, not a static file).
     */
    '/**': {
      headers: {
        'content-security-policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https://tile.openstreetmap.org",
          "font-src 'self'",
          "connect-src 'self' https://tile.openstreetmap.org",
          "worker-src 'self' blob:",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'"
        ].join('; '),
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
        // Nothing in this app uses any of these — deny them all outright
        // rather than leaving them at the (permissive) browser default.
        'permissions-policy':
          'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
      }
    }
  },
  /**
   * `compressPublicAssets: true` (Day 25, Lighthouse Performance gate on
   * /de/stations/47109): without it, `node .output/server/index.mjs` — the
   * same command used by the Lighthouse job in CI — compresses nothing,
   * verified with `curl -H "Accept-Encoding: gzip, br"`: no
   * `Content-Encoding`, raw bytes identical to the Content-Length. The plan
   * explicitly requires "initial bundle under 300 kB gzip" — 884 kB of
   * critical JS+CSS transferred WITHOUT compression (measured with
   * Lighthouse's "network-requests" audit) made that target unreachable no
   * matter what else was trimmed. Pre-compresses the static assets in
   * `.output/public` with gzip+brotli at build time (JS/CSS/font, not the
   * per-request rendered HTML); Nitro serves the compressed variant when the
   * client accepts it.
   */
  nitro: {
    compressPublicAssets: true
  }
})
