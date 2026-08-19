import { expect, test } from '@playwright/test'
import { DashboardPage } from '../pages/DashboardPage'
import { LoginPage } from '../pages/LoginPage'

test.describe('login -> dashboard', () => {
  test('un operatore che si logga arriva alla dashboard con i KPI', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboard = new DashboardPage(page)

    await loginPage.goto()
    await loginPage.loginAs('operator', 'operator123')
    await page.waitForURL('**/de')

    await expect(dashboard.kpiCard('Stationen gesamt')).toBeVisible()
    await expect(dashboard.kpiCard('In Ladung')).toBeVisible()
  })

  test('credenziali sbagliate mostrano un errore e restano sulla pagina di login', async ({
    page
  }) => {
    const loginPage = new LoginPage(page)

    await loginPage.goto()
    await loginPage.loginAs('operator', 'password-sbagliata')

    await expect(loginPage.errorAlert).toBeVisible()
    await expect(page).toHaveURL(/\/de\/login/)
  })

  test('/tariffs senza sessione reindirizza al login e torna alla pagina di destinazione dopo il login', async ({
    page
  }) => {
    const loginPage = new LoginPage(page)

    await page.goto('/de/tariffs')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/de\/login\?redirectTo=(%2F|\/)de(%2F|\/)tariffs/)

    await loginPage.loginAs('operator', 'operator123')
    await page.waitForURL('**/de/tariffs')
  })
})
