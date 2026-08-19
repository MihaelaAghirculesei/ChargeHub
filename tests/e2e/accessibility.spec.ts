import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

/**
 * Scansione axe-core (Giorno 18, "Fatto quando: axe non riporta
 * violazioni") sulle pagine pubbliche principali. `/tariffs` è protetta
 * (Giorno 16): loggato separatamente sotto, non qui — le pagine pubbliche
 * non devono richiedere una sessione per essere verificate.
 */
const PUBLIC_PAGES = [
  '/de',
  '/de/stations',
  '/de/stations/47109',
  '/de/sessions',
  '/de/analytics',
  '/de/login'
]

/**
 * Il pannello di Nuxt DevTools (solo in `pnpm dev`, mai in produzione) non è
 * contenuto in una landmark — non è superficie della nostra app, escluderlo
 * evita falsi positivi legati a un tool di sviluppo.
 */
async function scanForViolations(page: Page) {
  return new AxeBuilder({ page })
    .exclude('[class*="nuxt-devtools"]')
    .exclude('nuxt-devtools-frame')
    .analyze()
}

async function loginAsOperator(page: Page) {
  await page.goto('/de/login')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('Benutzername').fill('operator')
  await page.getByLabel('Passwort').fill('operator123')
  await page.locator('form').getByRole('button', { name: 'Anmelden' }).click()
  await page.waitForURL('**/de')
}

for (const path of PUBLIC_PAGES) {
  test(`nessuna violazione axe su ${path}`, async ({ page }) => {
    await page.goto(path)
    // Le pagine con `useLiveTelemetry`/liste virtualizzate finiscono di
    // stabilizzarsi poco dopo il load — un piccolo margine evita falsi
    // positivi su contenuto ancora in transizione.
    await page.waitForLoadState('networkidle')

    const results = await scanForViolations(page)
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

test('nessuna violazione axe su /tariffs dopo il login', async ({ page }) => {
  await loginAsOperator(page)

  await page.goto('/de/tariffs')
  await page.waitForLoadState('networkidle')

  const results = await scanForViolations(page)
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})
