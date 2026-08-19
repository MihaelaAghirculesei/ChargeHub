import { expect, test } from '@playwright/test'
import { StationsPage } from '../pages/StationsPage'

/**
 * Vista "Geteilt" (split) è il default (nessun cookie, StationsFiltersStore):
 * mappa e tabella sono già entrambe visibili senza dover cambiare vista.
 *
 * Non testato: click su un marker preciso della mappa. MapLibre renderizza
 * su canvas/WebGL — le coordinate pixel di una stazione dipendono dalla sua
 * proiezione cartografica (lat/lon -> pixel, zoom incluso), che ricalcolare
 * qui duplicherebbe la logica della libreria solo per ottenere un test
 * fragile a ogni minima modifica di viewport/zoom di default. La sincronia
 * mappa <-> lista è verificata nella direzione testabile in modo stabile:
 * hover sulla riga della tabella (StationsTable.vue `rowProps`) scrive
 * `hoveredStationId` nello store — stessa fonte di verità che la mappa legge
 * per il proprio `feature-state` (StationsMap.vue), quindi verificarlo da un
 * lato conferma che il canale di sincronizzazione funziona.
 */
test.describe('mappa <-> lista sincronizzate', () => {
  test('la vista split mostra mappa e tabella insieme, con hover che evidenzia la riga', async ({
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

  test('la vista mappa mostra solo la mappa, la vista lista solo la tabella', async ({ page }) => {
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
