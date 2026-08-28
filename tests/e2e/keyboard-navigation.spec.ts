import { expect, test } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'

test('the skip link is the first reachable element and leads to the main content', async ({
  page
}) => {
  await page.goto('/de')
  // `/de` is client-side (day 21): the first response is an empty shell,
  // the layout (skip link included) exists only after hydration.
  const skipLink = page.locator('.skip-link')
  await skipLink.waitFor({ state: 'attached' })

  // No click: keyboard only, as the plan's "Done when" requires.
  await page.keyboard.press('Tab')
  await expect(skipLink).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
})

test('focus stays visible during keyboard navigation', async ({ page }) => {
  await page.goto('/de')
  await page.locator('.skip-link').waitFor({ state: 'attached' })
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')

  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
  // outline/box-shadow not "none": an explicit focus ring (see
  // app/assets/css/accessibility.css) stays applied regardless of what
  // Vuetify does internally.
  const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle)
  const boxShadow = await focused.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(outline !== 'none' || boxShadow !== 'none').toBe(true)
})

test('the tariff creation dialog traps focus and returns it on close', async ({ page }) => {
  await new LoginPage(page).loginAsOperator()

  await page.goto('/de/tariffs')
  // SSR, not an empty shell: the button already exists in the initial
  // HTML, so `waitFor({ state: 'attached' })` on it would not wait for
  // hydration (same problem as the test above, different cause) —
  // `networkidle` covers the real wait, same pattern as
  // tests/e2e/accessibility.spec.ts.
  await page.waitForLoadState('networkidle')
  const openButton = page.getByRole('button', { name: 'Neuer Tarif' })
  await openButton.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Repeated Tabs must never move the focus out of the open dialog.
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Tab')
    const focusedInsideDialog = await dialog.locator(':focus').count()
    expect(focusedInsideDialog).toBeGreaterThan(0)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(openButton).toBeFocused()
})

test('the icon buttons have a touch target of at least 44×44px', async ({ page }) => {
  await new LoginPage(page).loginAsOperator()

  await page.goto('/de/tariffs')
  // See the comment in the test above: SSR, `networkidle` is needed to
  // wait for hydration before interacting.
  await page.waitForLoadState('networkidle')

  // Test environment with no prior cookies: no tariff exists yet, so the
  // icon buttons to measure would not be there — create one.
  await page.getByRole('button', { name: 'Neuer Tarif' }).click()
  await page.getByLabel('Name').fill('Test Tarif')
  await page.locator('.v-dialog').getByRole('button', { name: 'Speichern' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()

  await page
    .getByRole('button', { name: /bearbeiten$/ })
    .first()
    .waitFor()

  const boxes = await page
    .locator('button[aria-label$="bearbeiten"], button[aria-label$="löschen"]')
    .all()
  expect(boxes.length).toBeGreaterThan(0)
  for (const button of boxes) {
    const box = await button.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  }
})
