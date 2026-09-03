import { defineVitestConfig } from '@nuxt/test-utils/config'
import { configDefaults } from 'vitest/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    // `tests/e2e` are Playwright specs (Day 18): same `*.spec.ts` pattern as
    // the unit tests, but they must only be run with `pnpm test:e2e`.
    // `tests/eval` really calls the Claude API (real cost, non-deterministic)
    // — run by hand with `pnpm eval:nl-search` only, never in the normal
    // suite or the CI gate. Same principle as `tests/e2e`, different reason.
    exclude: [...configDefaults.exclude, 'tests/e2e/**', 'tests/eval/**'],
    // The default (10s) proved marginal (Day 23) under the load of a machine
    // with several builds/servers/browsers open in parallel: `setupNuxt()`
    // (the "nuxt" environment initialization per test file) ended in
    // hook-timeout intermittently, non-deterministically — the exact same
    // code, different outcomes between one run and the next. Not just a fix
    // for tonight: a slower CI runner can have the same tight margin.
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/.nuxt/**', '**/tests/e2e/**'],
      // The plan's threshold (Day 19: "Target >= 80%"), actually enforced
      // (Day 22, CI gate) — not just a number in a report nobody checks.
      // Real state at Day 21: 91.82%/93.19% statements/lines, 82.57%/89.79%
      // branches/functions — thresholds set below those values to leave
      // margin, not at today's exact minimum.
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 75
      }
    }
  }
})
