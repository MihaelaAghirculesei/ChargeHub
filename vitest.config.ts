import { defineVitestConfig } from '@nuxt/test-utils/config'
import { configDefaults } from 'vitest/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    // `tests/e2e` sono spec Playwright (Giorno 18): stesso pattern `*.spec.ts`
    // dei test unitari, ma vanno eseguiti solo con `pnpm test:e2e`.
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
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
