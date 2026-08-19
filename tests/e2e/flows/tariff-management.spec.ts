import { expect, test } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { TariffsPage } from '../pages/TariffsPage'

test.describe('creazione tariffa e calcolo', () => {
  test('un operatore crea una tariffa, la vede in tabella e nel calcolatore per sessione', async ({
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

    // Il calcolatore confronta la tariffa appena creata contro una sessione
    // reale (dati sintetici, Giorno 12): comparire come riga del confronto è
    // la prova che il form -> store -> calcolatore sono davvero collegati,
    // non solo che il dialog "sembra" salvare.
    await tariffsPage.selectFirstSession()
    await expect(tariffsPage.calculatorTable.getByText(tariffName)).toBeVisible()
  })

  test('un viewer vede le tariffe ma non può crearne di nuove', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const tariffsPage = new TariffsPage(page)

    await loginPage.goto()
    await loginPage.loginAs('viewer', 'viewer123')
    await page.waitForURL('**/de')

    await tariffsPage.goto()
    await expect(tariffsPage.newTariffButton).toHaveCount(0)
  })
})
