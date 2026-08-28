import { expect, test } from '@playwright/test'
import { StationsPage } from '../pages/StationsPage'

/**
 * The "Geteilt" (split) view is the default (no cookie, StationsFiltersStore):
 * map and table are both already visible without switching view.
 *
 * Not tested: clicking a precise map marker. MapLibre renders on
 * canvas/WebGL — a station's pixel coordinates depend on its map
 * projection (lat/lon -> pixel, zoom included), and recomputing that here
 * would duplicate the library's logic just to get a test fragile to any
 * small change of default viewport/zoom. The map <-> list sync is verified
 * in the stably-testable direction: hovering a table row (StationsTable.vue
 * `rowProps`) writes `hoveredStationId` to the store — the same source of
 * truth the map reads for its own `feature-state` (StationsMap.vue), so
 * verifying it from one side confirms the sync channel works.
 */
test.describe('map <-> list synced', () => {
  test('the split view shows map and table together, with hover highlighting the row', async ({
    page
  }) => {
    const stationsPage = new StationsPage(page)
    await stationsPage.goto()
    await stationsPage.waitForMapReady()

    await expect(stationsPage.table).toBeVisible()

    const firstRow = stationsPage.table.locator('tbody tr').first()
    await expect(firstRow).not.toHaveClass(/bg-surface-variant/)

    await firstRow.hover()
    await expect(firstRow).toHaveClass(/bg-surface-variant/)

    await stationsPage.map.hover()
    await expect(firstRow).not.toHaveClass(/bg-surface-variant/)
  })

  test('the map view shows only the map, the list view only the table', async ({ page }) => {
    const stationsPage = new StationsPage(page)
    await stationsPage.goto()

    await stationsPage.viewModeButton('Karte').click()
    await stationsPage.waitForMapReady()
    await expect(stationsPage.table).toBeHidden()

    await stationsPage.viewModeButton('Liste').click()
    await expect(stationsPage.table).toBeVisible()
    await expect(stationsPage.map).toBeHidden()
  })
})
