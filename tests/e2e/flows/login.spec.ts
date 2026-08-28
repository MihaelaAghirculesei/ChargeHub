import { expect, test } from '@playwright/test'
import { DashboardPage } from '../pages/DashboardPage'
import { LoginPage } from '../pages/LoginPage'

test.describe('login -> dashboard', () => {
  test('an operator who logs in reaches the dashboard with the KPIs', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboard = new DashboardPage(page)

    await loginPage.goto()
    await loginPage.loginAs('operator', 'operator123')
    await page.waitForURL('**/de')

    await expect(dashboard.kpiCard('Stationen gesamt')).toBeVisible()
    await expect(dashboard.kpiCard('In Ladung')).toBeVisible()
  })

  test('wrong credentials show an error and stay on the login page', async ({ page }) => {
    const loginPage = new LoginPage(page)

    await loginPage.goto()
    await loginPage.loginAs('operator', 'wrong-password')

    await expect(loginPage.errorAlert).toBeVisible()
    await expect(page).toHaveURL(/\/de\/login/)
  })

  test('/tariffs with no session redirects to login and returns to the target page after login', async ({
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
