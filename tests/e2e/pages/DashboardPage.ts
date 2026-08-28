import type { Page } from '@playwright/test'

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/de')
    await this.page.waitForLoadState('networkidle')
  }

  /** A KPI card by title (e.g. "Stationen gesamt", see i18n/locales/de.ts). */
  kpiCard(label: string) {
    return this.page.locator('.v-card', { hasText: label })
  }

  navLink(label: string) {
    return this.page.getByRole('link', { name: label, exact: true })
  }
}
