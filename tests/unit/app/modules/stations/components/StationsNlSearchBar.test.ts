import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import StationsNlSearchBar from '~/modules/stations/components/StationsNlSearchBar.vue'

describe('StationsNlSearchBar', () => {
  it('always shows the covered-area hint, not only as a placeholder', async () => {
    const wrapper = await mountSuspended(StationsNlSearchBar)

    const hint = wrapper.find('[data-testid="nl-search-hint"]')
    expect(hint.exists()).toBe(true)
    expect(hint.text()).toContain('Wolfsburg/Braunschweig/Gifhorn')
  })
})
