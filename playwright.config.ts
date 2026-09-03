import { defineConfig, devices } from '@playwright/test'

/**
 * `webServer` starts a dev server on its own on a dedicated port (3011, not
 * 3010 — that one is taken by the manual production-build checks used on
 * every previous day, see docs/PROGRESS.md) and waits for it to respond
 * before starting the tests. `reuseExistingServer` locally: if a dev server
 * is already running on that port, it does not start a second one.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 1 even locally, not only in CI: under the load of 4 parallel projects
  // against a single shared dev server, WebKit in particular showed an
  // isolated failure that did not reproduce when run in isolation (login
  // succeeded but the session was not yet persisted on the next navigation)
  // — environment flakiness, not a reproducible bug: a second attempt
  // confirms it without hiding it (a real failure would still fail on retry).
  retries: 1,
  reporter: 'list',
  // A single dev server shared by 4 parallel projects (Day 20): the default
  // of 30s per test became marginal under load (an axe scan went over it
  // once), especially for pages with virtualized lists / live telemetry.
  timeout: 45_000,
  // Without a cap, Playwright spawns as many workers as there are available
  // cores PER PROJECT — with 4 projects against a single dev server (`pnpm
  // dev`, not a production build) it becomes a real bottleneck: slow
  // responses made asserts with a timeout of only 5s (default) time out on
  // WebKit / mobile viewport, never happened with a single project active.
  workers: 4,
  use: {
    baseURL: 'http://localhost:3011',
    trace: 'on-first-retry',
    actionTimeout: 10_000
  },
  expect: {
    timeout: 10_000
  },
  /**
   * axe-core and keyboard navigation (Day 18) run only on `chromium`: they
   * are DOM/ARIA checks computed by JS, not dependent on the rendering
   * engine — repeating them on every browser/viewport costs 4x the time
   * with no new signal. The Day 20 user flows (`tests/e2e/flows/`) run on
   * all four projects: what the plan asks to cover — Chromium + WebKit,
   * desktop and mobile — is the real functional behavior, not the
   * accessibility scan itself.
   */
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /accessibility\.spec|keyboard-navigation\.spec/
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      testIgnore: /accessibility\.spec|keyboard-navigation\.spec/
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
      testIgnore: /accessibility\.spec|keyboard-navigation\.spec/
    }
  ],
  webServer: {
    command: 'pnpm dev --port 3011',
    url: 'http://localhost:3011',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
