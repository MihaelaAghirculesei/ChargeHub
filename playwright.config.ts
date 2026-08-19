import { defineConfig, devices } from '@playwright/test'

/**
 * `webServer` avvia da solo un dev server su una porta dedicata (3011, non
 * 3010 — quella è occupata dalle verifiche manuali di build di produzione
 * usate in ogni giorno precedente, vedi docs/PROGRESS.md) e aspetta che
 * risponda prima di far partire i test. `reuseExistingServer` in locale:
 * se un dev server è già attivo su quella porta, non ne avvia un secondo.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3011',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev --port 3011',
    url: 'http://localhost:3011',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
