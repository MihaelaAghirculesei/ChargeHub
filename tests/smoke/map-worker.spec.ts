import { expect, test } from '@playwright/test'

/**
 * Guards against the PR #41 class of bug: the map canvas and tiles render,
 * the console stays clean, but the MapLibre worker (which parses the
 * GeoJSON/cluster layer) fails to load, so no station markers appear.
 * Only a production build shows it, and only a dependency bump triggers
 * it — exactly what Dependabot auto-merge would otherwise ship unseen.
 */
test('the production build serves every /_nuxt asset and loads the MapLibre worker', async ({
  page
}) => {
  const failedAssets: string[] = []
  page.on('response', (response) => {
    if (response.url().includes('/_nuxt/') && response.status() >= 400) {
      failedAssets.push(`${response.status()} ${response.url()}`)
    }
  })

  const workerResponse = page.waitForResponse((response) =>
    /\/_nuxt\/maplibre-gl-worker[^/]*\.js$/.test(new URL(response.url()).pathname)
  )

  await page.goto('/de/stations')
  await page.locator('.maplibregl-canvas').waitFor({ state: 'visible', timeout: 20_000 })

  expect((await workerResponse).status()).toBe(200)
  await page.waitForLoadState('networkidle')
  expect(failedAssets, failedAssets.join('\n')).toEqual([])
})
