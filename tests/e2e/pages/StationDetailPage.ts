import type { Page } from '@playwright/test'

export class StationDetailPage {
  constructor(private readonly page: Page) {}

  get heading() {
    return this.page.getByRole('heading', { level: 1 })
  }
}
