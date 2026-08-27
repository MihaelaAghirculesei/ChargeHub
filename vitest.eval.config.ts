import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * A config separate from vitest.config.ts on purpose: that one excludes
 * tests/eval (it really calls the Claude API — real cost, non-deterministic
 * — and must not run in the normal suite or the CI gate). This one just
 * includes it.
 *
 * `environment: 'node'`, not "nuxt" like the rest of the project: the code
 * under test here is conceptually pure server-side (no component, no DOM),
 * and the "nuxt" env brings the globals of a simulated browser (jsdom) —
 * the Anthropic SDK detects them and refuses to build a client with a real
 * key for safety ("It looks like you're running in a browser-like
 * environment"), correctly: that check exists to avoid exposing a real key
 * in the bundle of a client-side app, not to block a local script. Aliases
 * resolved by hand because the "nuxt" env would give them for free, "node"
 * would not.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/eval/**/*.eval.ts'],
    // Real API calls, not a batch of unit tests: a generous timeout avoids
    // false negatives from normal network latency.
    testTimeout: 30_000
  },
  resolve: {
    alias: {
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '~~': fileURLToPath(new URL('.', import.meta.url))
    }
  }
})
