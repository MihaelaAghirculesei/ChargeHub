import { expect, test } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'

test('lo skip link è il primo elemento raggiungibile e porta al contenuto principale', async ({
  page
}) => {
  await page.goto('/de')
  // `/de` è client-side (Giorno 21): la prima risposta è un guscio vuoto,
  // il layout (skip link incluso) esiste solo dopo l'idratazione.
  const skipLink = page.locator('.skip-link')
  await skipLink.waitFor({ state: 'attached' })

  // Nessun click: solo tastiera, come richiesto dal "Fatto quando" del piano.
  await page.keyboard.press('Tab')
  await expect(skipLink).toBeFocused()

  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
})

test('il focus resta visibile durante la navigazione da tastiera', async ({ page }) => {
  await page.goto('/de')
  await page.locator('.skip-link').waitFor({ state: 'attached' })
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')

  const focused = page.locator(':focus')
  await expect(focused).toBeVisible()
  // outline/box-shadow non a "none": un anello di focus esplicito (vedi
  // app/assets/css/accessibility.css) resta applicato indipendentemente
  // da cosa fa internamente Vuetify.
  const outline = await focused.evaluate((el) => getComputedStyle(el).outlineStyle)
  const boxShadow = await focused.evaluate((el) => getComputedStyle(el).boxShadow)
  expect(outline !== 'none' || boxShadow !== 'none').toBe(true)
})

test('il dialog di creazione tariffa intrappola il focus e lo restituisce alla chiusura', async ({
  page
}) => {
  await new LoginPage(page).loginAsOperator()

  await page.goto('/de/tariffs')
  const openButton = page.getByRole('button', { name: 'Neuer Tarif' })
  await openButton.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // Tab ripetuti non devono mai far uscire il focus dal dialog aperto.
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press('Tab')
    const focusedInsideDialog = await dialog.locator(':focus').count()
    expect(focusedInsideDialog).toBeGreaterThan(0)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(openButton).toBeFocused()
})

test('i pulsanti icona hanno un’area di tocco di almeno 44×44px', async ({ page }) => {
  await new LoginPage(page).loginAsOperator()

  await page.goto('/de/tariffs')

  // Ambiente di test senza cookie pregressi: nessuna tariffa esiste ancora,
  // quindi i pulsanti icona da misurare non ci sarebbero — se ne crea una.
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
