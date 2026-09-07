import { expect, test } from '@playwright/test'
import { StationDetailPage } from '../pages/StationDetailPage'
import { StationsPage } from '../pages/StationsPage'

test.describe('station search and filter -> open detail', () => {
  test('a minimum-power filter reduces the results shown in the table', async ({ page }) => {
    const stationsPage = new StationsPage(page)
    await stationsPage.goto()
    await stationsPage.viewModeButton('Liste').click()
    await page.waitForLoadState('networkidle')
    // `networkidle` alone is not enough: the request may already be done
    // but the table not yet have run its own render (skeleton -> real
    // rows), especially under the load of several Playwright projects in
    // parallel. Waiting for the first real row is deterministic, a second
    // `networkidle` / fixed timeout is not.
    await stationsPage.table.locator('tbody tr').first().waitFor()

    const rowsBefore = await stationsPage.table.locator('tbody tr').count()

    await stationsPage.minPowerInput.fill('50')
    await page.waitForLoadState('networkidle')

    const rowsAfter = await stationsPage.table.locator('tbody tr').count()
    expect(rowsAfter).toBeLessThanOrEqual(rowsBefore)

    // "Alle löschen" (StationsActiveFilterChips, day 6) clears everything again.
    await stationsPage.clearAllFiltersButton.click()
    await expect(stationsPage.minPowerInput).toHaveValue('')
  })

  test('sorting by the Betreiber column re-fetches and reorders the rows', async ({ page }) => {
    const stationsPage = new StationsPage(page)
    await stationsPage.goto()
    await stationsPage.viewModeButton('Liste').click()
    await page.waitForLoadState('networkidle')
    await stationsPage.table.locator('tbody tr').first().waitFor()

    const before = await stationsPage.operatorCells().allInnerTexts()
    expect(before.length).toBeGreaterThan(1)

    await stationsPage.sortByColumn('Betreiber', 'operator')
    const ascending = await stationsPage.operatorCells().allInnerTexts()

    // The re-fetch is the point of the test: a broken watch left the list
    // untouched after the header click (only Vuetify's arrow flipped).
    expect(ascending).not.toEqual(before)

    // `paginate()` pushes "no operator" rows to the end regardless of
    // direction and compares with a plain `<` (code points), so mirror that
    // here rather than a locale-aware collation.
    const known = ascending.filter((value) => value !== 'Unbekannt')
    expect(known).toEqual([...known].sort())

    // A second click flips to descending.
    await stationsPage.sortByColumn('Betreiber', 'operator')
    const descending = await stationsPage.operatorCells().allInnerTexts()
    expect(descending).not.toEqual(ascending)
  })

  test('opening a table row leads to the detail with the same name in the heading', async ({
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
