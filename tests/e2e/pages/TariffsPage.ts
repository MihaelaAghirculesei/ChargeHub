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
   * v-select non è un <select> nativo: apre l'overlay e clicca l'opzione
   * per indice (l'elenco è generato dalle sessioni sintetiche, non ha
   * testo stabile). `force: true`: l'input reale di v-select ha
   * `pointer-events` gestiti dal wrapper `.v-field__input` che lo
   * sovrappone e intercetta il click di Playwright — l'apertura
   * dell'overlay funziona comunque, è così che il componente è costruito.
   */
  async selectFirstSession() {
    await this.sessionSelect.click({ force: true })
    // Non `.v-list-item` da solo: la stessa classe è anche sulle voci del
    // drawer di navigazione, sempre nel DOM. Le opzioni del menu aperto
    // hanno `role="option"` (Vuetify le espone come parte di un listbox).
    await this.page.getByRole('option').first().click()
  }

  get overstayMinutesInput() {
    return this.page.getByLabel('Standzeit nach Ladeende (Min., optional)')
  }

  get calculatorTable() {
    return this.page.locator('.v-table', { hasText: 'Kosten' })
  }
}
