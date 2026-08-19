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
  // 1 anche in locale, non solo in CI: sotto il carico di 4 progetti
  // paralleli contro un solo dev server condiviso, WebKit in particolare
  // ha mostrato un fallimento isolato non riproducibile in esecuzione
  // isolata (login riuscito ma sessione non ancora persistita alla
  // navigazione successiva) — flakiness d'ambiente, non un bug
  // riproducibile: un secondo tentativo lo conferma senza nasconderlo (un
  // fallimento reale fallirebbe comunque al retry).
  retries: 1,
  reporter: 'list',
  // Un solo dev server condiviso da 4 progetti in parallelo (Giorno 20): il
  // default di 30s per test è diventato marginale sotto carico (una scansione
  // axe ci è finita sopra una volta), specie per pagine con liste
  // virtualizzate/telemetria live.
  timeout: 45_000,
  // Senza un tetto, Playwright lancia tanti worker quanti i core disponibili
  // PER PROGETTO — con 4 progetti contro un solo dev server (`pnpm dev`, non
  // una build di produzione) diventa un collo di bottiglia reale: risposte
  // lente hanno fatto scadere assert con timeout di solo 5s (default) su
  // WebKit/viewport mobile, mai capitato con un solo progetto attivo.
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
   * axe-core e navigazione da tastiera (Giorno 18) girano solo su
   * `chromium`: sono verifiche DOM/ARIA calcolate da JS, non dipendenti dal
   * motore di rendering — ripeterle su ogni browser/viewport 4x il tempo
   * senza segnale nuovo. I flussi utente di Giorno 20 (`tests/e2e/flows/`)
   * girano su tutti e quattro i progetti: quello che il piano chiede di
   * coprire — Chromium + WebKit, desktop e mobile — è il comportamento
   * funzionale reale, non la scansione di accessibilità in sé.
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
