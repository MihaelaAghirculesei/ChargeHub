import { expect, test } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { TariffsPage } from '../pages/TariffsPage'

test.describe('tariff creation and calculation', () => {
  test('an operator creates a tariff, sees it in the table and in the per-session calculator', async ({
    page
  }) => {
    const loginPage = new LoginPage(page)
    const tariffsPage = new TariffsPage(page)
    const tariffName = `Test E2E ${Date.now()}`

    await loginPage.loginAsOperator()
    await tariffsPage.goto()

    await tariffsPage.createTariff({ name: tariffName, pricePerKwh: 0.45 })
    await expect(tariffsPage.dialog).toBeHidden()
    await expect(tariffsPage.tariffRow(tariffName)).toBeVisible()

    // The calculator compares the just-created tariff against a real
    // session (synthetic data, day 12): showing up as a comparison row is
    // the proof that form -> store -> calculator are actually wired, not
    // just that the dialog "looks like" it saves.
    await tariffsPage.selectFirstSession()
    await expect(tariffsPage.calculatorTable.getByText(tariffName)).toBeVisible()
  })

  test('a viewer sees the tariffs but cannot create new ones', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const tariffsPage = new TariffsPage(page)

    await loginPage.goto()
    await loginPage.loginAs('viewer', 'viewer123')
    await page.waitForURL('**/de')

    await tariffsPage.goto()
    await expect(tariffsPage.newTariffButton).toHaveCount(0)
  })
})
