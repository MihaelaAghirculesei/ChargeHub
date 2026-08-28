import type { Page } from '@playwright/test'

/**
 * Page Object Model (day 20): a single place that knows how to interact
 * with `/de/login`, not locators repeated in every spec — if a translated
 * label or the form structure changes, it is updated here once.
 */
export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/de/login')
    // The day-18 fix (VForm native submit) made the order "wait for
    // stabilisation before interacting" not optional, not just prudence: a
    // click before hydration finishes can fall back to something like a
    // native submit of the underlying form.
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
    // `getByRole('alert')` alone also picks up the (empty) validation
    // message containers of every v-text-field, not only the real error
    // banner — that one is a v-alert, discovered by class.
    return this.page.locator('.v-alert[role="alert"]')
  }
}
