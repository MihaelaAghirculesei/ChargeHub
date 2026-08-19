import { expect, test } from '@playwright/test'
import { StationDetailPage } from '../pages/StationDetailPage'
import { StationsPage } from '../pages/StationsPage'

test.describe('ricerca e filtro stazioni -> apertura dettaglio', () => {
  test('un filtro per potenza minima riduce i risultati mostrati in tabella', async ({ page }) => {
    const stationsPage = new StationsPage(page)
    await stationsPage.goto()
    await stationsPage.viewModeButton('Liste').click()
    await page.waitForLoadState('networkidle')
    // `networkidle` da solo non basta: la richiesta può già essere finita
    // ma la tabella non aver ancora eseguito il proprio render (skeleton
    // -> righe reali), specie sotto il carico di più progetti Playwright
    // in parallelo. Aspettare la prima riga vera è deterministico, un
    // secondo `networkidle`/timeout fisso no.
    await stationsPage.table.locator('tbody tr').first().waitFor()

    const rowsBefore = await stationsPage.table.locator('tbody tr').count()

    await stationsPage.minPowerInput.fill('50')
    await page.waitForLoadState('networkidle')

    const rowsAfter = await stationsPage.table.locator('tbody tr').count()
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore)

    // "Alle löschen" (StationsActiveFilterChips, Giorno 6) azzera di nuovo tutto.
    await stationsPage.clearAllFiltersButton.click()
    await expect(stationsPage.minPowerInput).toHaveValue('')
  })

  test('aprire una riga della tabella porta al dettaglio con lo stesso nome nell’intestazione', async ({
    page
  }) => {
    const stationsPage = new StationsPage(page)
    const detailPage = new StationDetailPage(page)

    await stationsPage.goto()
    await stationsPage.viewModeButton('Liste').click()
    await page.waitForLoadState('networkidle')

    const firstRow = stationsPage.table.locator('tbody tr').first()
    await firstRow.waitFor()
    const stationName = (await firstRow.locator('td').first().textContent())?.trim()
    expect(stationName).toBeTruthy()

    await firstRow.click()
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/de\/stations\/\d+/)
    await expect(detailPage.heading).toHaveText(stationName!)
  })
})
