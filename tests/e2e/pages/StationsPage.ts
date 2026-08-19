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
    // `getByLabel` da solo prende anche il pulsante "pulisci" del campo
    // (`clearable`, il suo aria-label contiene la stessa label): il campo
    // vero e proprio ha ruolo `spinbutton` (type="number").
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

  get map() {
    return this.page.locator('.maplibregl-canvas')
  }

  /**
   * MapLibre viene importato dinamicamente e inizializza un contesto
   * WebGL/carica lo stile prima di creare il canvas — più lento del solo
   * `networkidle` che `goto()` già aspetta, specie sotto il carico di più
   * progetti Playwright in parallelo sullo stesso dev server.
   */
  async waitForMapReady() {
    await this.map.waitFor({ state: 'visible', timeout: 15_000 })
  }

  tableRow(stationName: string): Locator {
    return this.table.locator('tbody tr', { hasText: stationName })
  }

  /** Debounce di 300ms sulla ricerca (StationsFilterBar.vue): non un dettaglio da ignorare in un test reale. */
  async search(text: string) {
    await this.searchInput.fill(text)
    await this.page.waitForTimeout(400)
    await this.page.waitForLoadState('networkidle')
  }

  async openFirstResult() {
    await this.table.locator('tbody tr').first().click()
  }
}
