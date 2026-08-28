import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'

/**
 * axe-core scan (day 18, "Done when: axe reports no violations") on the
 * main public pages. `/tariffs` is protected (day 16): logged in
 * separately below, not here — the public pages must not require a session
 * to be verified.
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
 * The Nuxt DevTools panel (only in `pnpm dev`, never in production) is not
 * contained in a landmark — it is not our app's surface, excluding it
 * avoids false positives tied to a dev tool.
 */
async function scanForViolations(page: Page) {
  return new AxeBuilder({ page })
    .exclude('[class*="nuxt-devtools"]')
    .exclude('nuxt-devtools-frame')
    .analyze()
}

for (const path of PUBLIC_PAGES) {
  test(`no axe violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    // Pages with `useLiveTelemetry` / virtualised lists finish
    // stabilising shortly after load — a small margin avoids false
    // positives on content still in transition. Real text inside `<main>`
    // (not just `networkidle`) also covers `/de` (client-side, day 21: the
    // first response is an empty shell, the content arrives after
    // hydration) and the first "cold" hit of a route with `swr` in `pnpm
    // dev`.
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(
      () => (document.querySelector('main')?.textContent?.trim().length ?? 0) > 0
    )

    const results = await scanForViolations(page)
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

test('no axe violations on /tariffs after login', async ({ page }) => {
  await new LoginPage(page).loginAsOperator()

  await page.goto('/de/tariffs')
  await page.waitForLoadState('networkidle')

  const results = await scanForViolations(page)
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})
