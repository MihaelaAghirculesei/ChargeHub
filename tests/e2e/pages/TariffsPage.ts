import type { Page } from '@playwright/test'

export class TariffsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/de/tariffs')
    await this.page.waitForLoadState('networkidle')
  }

  get newTariffButton() {
    return this.page.getByRole('button', { name: 'Neuer Tarif' })
  }

  get dialog() {
    return this.page.getByRole('dialog')
  }

  async createTariff(input: {
    name: string
    pricePerKwh: number
    blockingFeePerMinute?: number
    monthlyFeeEur?: number
  }) {
    await this.newTariffButton.click()
    await this.dialog.getByLabel('Name').fill(input.name)
    await this.dialog.getByLabel('Preis (€/kWh)').fill(String(input.pricePerKwh))
    if (input.blockingFeePerMinute !== undefined) {
      await this.dialog
        .getByLabel('Blockiergebühr (€/Min)')
        .fill(String(input.blockingFeePerMinute))
    }
    if (input.monthlyFeeEur !== undefined) {
      await this.dialog.getByLabel('Grundgebühr (€/Monat)').fill(String(input.monthlyFeeEur))
    }
    await this.dialog.getByRole('button', { name: 'Speichern' }).click()
  }

  tariffRow(name: string) {
    return this.page.locator('table tbody tr', { hasText: name })
  }

  get sessionSelect() {
    return this.page.getByLabel('Sitzung auswählen')
  }

  /**
   * v-select is not a native <select>: it opens the overlay and clicks the
   * option by index (the list is generated from the synthetic sessions, it
   * has no stable text). `force: true`: v-select's real input has
   * `pointer-events` handled by the `.v-field__input` wrapper that overlays
   * it and intercepts Playwright's click — opening the overlay works
   * anyway, that is how the component is built.
   */
  async selectFirstSession() {
    await this.sessionSelect.click({ force: true })
    // Not `.v-list-item` alone: the same class is also on the navigation
    // drawer items, always in the DOM. The open menu's options have
    // `role="option"` (Vuetify exposes them as part of a listbox).
    await this.page.getByRole('option').first().click()
  }

  get overstayMinutesInput() {
    return this.page.getByLabel('Standzeit nach Ladeende (Min., optional)')
  }

  get calculatorTable() {
    return this.page.locator('.v-table', { hasText: 'Kosten' })
  }
}
