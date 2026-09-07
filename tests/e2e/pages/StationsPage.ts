import type { Locator, Page } from '@playwright/test'

export class StationsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/de/stations')
    await this.page.waitForLoadState('networkidle')
  }

  get searchInput() {
    return this.page.getByLabel('Suche (Name, Betreiber, Stadt)')
  }

  get minPowerInput() {
    // `getByLabel` alone also picks up the field's "clear" button
    // (`clearable`, its aria-label contains the same label): the field
    // itself has role `spinbutton` (type="number").
    return this.page.getByRole('spinbutton', { name: 'Min. Leistung (kW)' })
  }

  get clearAllFiltersButton() {
    return this.page.getByRole('button', { name: 'Alle löschen' })
  }

  viewModeButton(label: 'Karte' | 'Liste' | 'Geteilt') {
    return this.page.getByRole('button', { name: label })
  }

  get table() {
    return this.page.locator('.v-data-table')
  }

  columnHeader(label: string): Locator {
    return this.page.getByRole('columnheader', { name: label })
  }

  /** Cells of the "Betreiber" column (2nd column, no select/expand column here). */
  operatorCells(): Locator {
    return this.table.locator('tbody tr td:nth-child(2)')
  }

  /**
   * `v-data-table-server` sorts on the server (see `useStations`): a header
   * click must trigger a `/api/stations` re-fetch, not only Vuetify's arrow
   * toggle. Waiting for that response (not `networkidle`, which resolves
   * immediately on an already-idle page) is what makes this deterministic.
   */
  async sortByColumn(label: string, sortKey: string) {
    const [response] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/api/stations?') && r.url().includes(`sortby=${sortKey}`)
      ),
      this.columnHeader(label).click()
    ])
    await response.finished()
    await this.table.locator('tbody tr').first().waitFor()
  }

  get map() {
    return this.page.locator('.maplibregl-canvas')
  }

  /**
   * MapLibre is imported dynamically and initialises a WebGL context /
   * loads the style before creating the canvas — slower than the
   * `networkidle` that `goto()` already waits for, especially under the
   * load of several Playwright projects in parallel on the same dev server.
   */
  async waitForMapReady() {
    await this.map.waitFor({ state: 'visible', timeout: 15_000 })
  }

  tableRow(stationName: string): Locator {
    return this.table.locator('tbody tr', { hasText: stationName })
  }

  /** 300ms debounce on the search (StationsFilterBar.vue): not a detail to ignore in a real test. */
  async search(text: string) {
    await this.searchInput.fill(text)
    await this.page.waitForTimeout(400)
    await this.page.waitForLoadState('networkidle')
  }

  async openFirstResult() {
    await this.table.locator('tbody tr').first().click()
  }
}
