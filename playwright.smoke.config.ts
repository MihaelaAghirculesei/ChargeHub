import { defineConfig, devices } from '@playwright/test'

/**
 * Smoke checks against the real production build (`node .output/server/index.mjs`),
 * not the dev server `playwright.config.ts` uses. Some failures only exist
 * after Rollup has bundled the app — the maplibre worker 404 behind PR #41
 * never showed up under `pnpm dev`. Chromium only: this is about what the
 * build emits, not about browser differences. Requires `pnpm build` first.
 */
export default defineConfig({
  testDir: './tests/smoke',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  timeout: 45_000,
  use: {
    baseURL: 'http://127.0.0.1:3012',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node .output/server/index.mjs',
    url: 'http://127.0.0.1:3012/de',
    env: { PORT: '3012', HOST: '127.0.0.1' },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
})
