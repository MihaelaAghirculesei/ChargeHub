import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import StationsNlSearchBar from '~/modules/stations/components/StationsNlSearchBar.vue'

describe('StationsNlSearchBar', () => {
  it('always shows a hint that the search does not move the map, not only as a placeholder', async () => {
    const wrapper = await mountSuspended(StationsNlSearchBar)

    const hint = wrapper.find('[data-testid="nl-search-hint"]')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('verschiebt die Karte nicht')
  })
})
