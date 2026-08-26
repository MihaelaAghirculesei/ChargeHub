import { defineVitestConfig } from '@nuxt/test-utils/config'
import { configDefaults } from 'vitest/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    // `tests/e2e` sono spec Playwright (Giorno 18): stesso pattern `*.spec.ts`
    // dei test unitari, ma vanno eseguiti solo con `pnpm test:e2e`.
    // `tests/eval` chiama davvero l'API Claude (costo reale, non
    // deterministico) — va eseguita solo a mano con `pnpm eval:nl-search`,
    // mai nella suite normale né nel gate CI. Stesso principio di
    // `tests/e2e`, motivo diverso.
    exclude: [...configDefaults.exclude, 'tests/e2e/**', 'tests/eval/**'],
    // Il default (10s) si è mostrato marginale (Giorno 23) sotto il carico
    // di una macchina con più build/server/browser aperti in parallelo:
    // `setupNuxt()` (l'inizializzazione dell'ambiente "nuxt" per file di
    // test) è finita in hook-timeout in modo intermittente, non
    // deterministico — stesso identico codice, esiti diversi tra un run e
    // l'altro. Non un fix per stanotte soltanto: un runner CI più lento
    // può avere lo stesso margine stretto.
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/.nuxt/**', '**/tests/e2e/**'],
      // Soglia del piano (Giorno 19: "Target >= 80%"), applicata per
      // davvero (Giorno 22, gate CI) — non solo un numero nel report che
      // nessuno controlla. Stato reale al Giorno 21: 91.82%/93.19%
      // statements/lines, 82.57%/89.79% branch/funzioni — soglie fissate
      // sotto quei valori per lasciare margine, non al minimo esatto di
      // oggi.
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 75
      }
    }
  }
})
