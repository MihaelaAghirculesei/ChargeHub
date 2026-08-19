import type { Page } from '@playwright/test'

/**
 * Page Object Model (Giorno 20): un punto solo che sa come interagire con
 * `/de/login`, non locator ripetuti in ogni spec — se cambia un'etichetta
 * tradotta o la struttura del form, si aggiorna qui una volta sola.
 */
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/de/login')
    // Il fix del Giorno 18 (submit nativo di VForm) ha reso l'ordine
    // "aspetta la stabilizzazione prima di interagire" non opzionale, non
    // solo prudenza: un click prima che l'hydration finisca può ricadere
    // su un comportamento simile a un submit nativo del form sottostante.
    await this.page.waitForLoadState('networkidle')
  }

  async loginAs(username: string, password: string) {
    await this.page.getByLabel('Benutzername').fill(username)
    await this.page.getByLabel('Passwort').fill(password)
    await this.page.locator('form').getByRole('button', { name: 'Anmelden' }).click()
  }

  async loginAsOperator() {
    await this.goto()
    await this.loginAs('operator', 'operator123')
    await this.page.waitForURL('**/de')
  }

  get errorAlert() {
    // `getByRole('alert')` da solo prende anche i contenitori (vuoti) dei
    // messaggi di validazione di ogni v-text-field, non solo il vero
    // banner d'errore — quello è un v-alert, va scoperto per classe.
    return this.page.locator('.v-alert[role="alert"]')
  }
}
