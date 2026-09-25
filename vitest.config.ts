import { defineVitestConfig } from '@nuxt/test-utils/config'
import { configDefaults } from 'vitest/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    // `tests/e2e` are Playwright specs: same `*.spec.ts` pattern as
    // the unit tests, but they must only be run with `pnpm test:e2e`.
    // `tests/eval` really calls the Claude API (real cost, non-deterministic)
    // — run by hand with `pnpm eval:nl-search` only, never in the normal
    // suite or the CI gate. Same principle as `tests/e2e`, different reason.
    // `tests/smoke` are Playwright specs against the production build.
    exclude: [...configDefaults.exclude, 'tests/e2e/**', 'tests/eval/**', 'tests/smoke/**'],
    // The default (10s) proved marginal under the load of a machine
    // with several builds/servers/browsers open in parallel: `setupNuxt()`
    // (the "nuxt" environment initialization per test file) ended in
    // hook-timeout intermittently, non-deterministically — the exact same
    // code, different outcomes between one run and the next. Not a local-only
    // workaround: a slower CI runner can have the same tight margin.
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/.nuxt/**', '**/tests/e2e/**'],
      // The 80% target, actually enforced
      // (CI gate) — not just a number in a report nobody checks.
      // Coverage when the gate was introduced: 91.82%/93.19% statements/lines, 82.57%/89.79%
      // branches/functions — thresholds set below those values to leave
      // margin, not at the exact minimum.
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 75
      }
    }
  }
})
