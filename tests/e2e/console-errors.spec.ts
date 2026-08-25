import { expect, type Page, test } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'

/**
 * Backlog item #1 (docs/PROGRESS.md, agreed 21/08): no test checked the
 * console before this, which is exactly what let the sessions hydration
 * mismatch (PR #5) slip through 24 days and the whole CI. This asserts zero
 * `console.error`/`console.warn`/uncaught page errors on every main route,
 * both public and authenticated.
 */
const PUBLIC_PAGES = [
  '/de',
  '/de/stations',
  '/de/stations/47109',
  '/de/sessions',
  '/de/analytics',
  '/de/login'
]

const AUTHENTICATED_PAGES = ['/de/tariffs']

/**
 * Two categories of browser/engine noise, confirmed by direct diagnosis
 * (not assumed) before being excluded here:
 *
 * 1. Headless Chromium's software GL driver logs a "GPU stall due to
 *    ReadPixels" performance warning on `/de/stations` (MapLibre render).
 *    Reproduced it in isolation, single worker, no other load on the
 *    machine — it's this machine's software GL driver, not app code.
 *
 * 2. WebKit reports a same-origin fetch cancelled by page navigation
 *    (`page.goto()` tearing down the previous page mid-request) as a
 *    misleading "... due to access control checks" TypeError instead of an
 *    AbortError. Confirmed via `requestfailed` (`errorText: 'Load request
 *    cancelled'`) on the exact same request — an explicit cancellation, not
 *    a real CORS/network failure. WebKit's own `error.message` for this
 *    (unlike `error.stack`, which does spell out "Fetch API cannot load
 *    http://...") is oddly truncated to just "/localhost:PORT/path...due to
 *    access control checks." — matched on that shape, not the fuller stack
 *    text. The app makes zero cross-origin requests client-side (OCM only
 *    ever runs server-side, see docs/adr/0002), so this can never mask a
 *    genuine CORS misconfiguration here. Restricted to `localhost` so it
 *    stays that narrow.
 */
function isKnownBenignNoise(text: string): boolean {
  return (
    /^\[\.WebGL-0x[0-9a-f]+\]GL Driver Message/i.test(text) ||
    (/localhost/.test(text) && /due to access control checks\.$/.test(text))
  )
}

async function collectConsoleIssues(page: Page) {
  const issues: string[] = []

  page.on('console', (msg) => {
    if ((msg.type() === 'error' || msg.type() === 'warning') && !isKnownBenignNoise(msg.text())) {
      issues.push(`[console.${msg.type()}] ${msg.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    if (!isKnownBenignNoise(error.message)) {
      issues.push(`[pageerror] ${error.message}`)
    }
  })

  return issues
}

async function gotoAndStabilize(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(
    () => (document.querySelector('main')?.textContent?.trim().length ?? 0) > 0
  )
}

for (const path of PUBLIC_PAGES) {
  test(`nessun errore/warning in console su ${path}`, async ({ page }) => {
    const issues = await collectConsoleIssues(page)

    await gotoAndStabilize(page, path)

    expect(issues, issues.join('\n')).toEqual([])
  })
}

test('nessun errore/warning in console su /tariffs dopo il login', async ({ page }) => {
  const issues = await collectConsoleIssues(page)

  await new LoginPage(page).loginAsOperator()
  for (const path of AUTHENTICATED_PAGES) {
    await gotoAndStabilize(page, path)
  }

  expect(issues, issues.join('\n')).toEqual([])
})
