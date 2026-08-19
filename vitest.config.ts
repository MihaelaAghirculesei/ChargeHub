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
      exclude: ['**/.nuxt/**', '**/tests/e2e/**']
    }
  }
})
