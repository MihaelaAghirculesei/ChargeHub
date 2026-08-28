import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import StationStatusChip from '~/modules/stations/components/StationStatusChip.vue'

describe('StationStatusChip', () => {
  it('operational: success colour, a confirm icon, the registry text', async () => {
    const wrapper = await mountSuspended(StationStatusChip, {
      props: { isOperational: true, label: 'Operational' }
    })

    expect(wrapper.text()).toContain('Operational')
    expect(wrapper.find('.v-chip').classes()).toContain('bg-success')
    expect(wrapper.find('.mdi-check-circle').exists()).toBe(true)
  })

  it('not operational: error colour, an alert icon', async () => {
    const wrapper = await mountSuspended(StationStatusChip, {
      props: { isOperational: false, label: 'Not Operational' }
    })

    expect(wrapper.find('.v-chip').classes()).toContain('bg-error')
    expect(wrapper.find('.mdi-alert-circle').exists()).toBe(true)
  })

  it('unknown (null): a neutral colour, a question-mark icon — never a random colour', async () => {
    const wrapper = await mountSuspended(StationStatusChip, {
      props: { isOperational: null, label: 'Planned for Future Date' }
    })

    expect(wrapper.find('.v-chip').classes()).toContain('bg-surface-variant')
    expect(wrapper.find('.mdi-help-circle').exists()).toBe(true)
  })

  it('status is never communicated by colour alone: text always present', async () => {
    const wrapper = await mountSuspended(StationStatusChip, {
      props: { isOperational: true, label: 'Operational' }
    })

    expect(wrapper.text().trim().length).toBeGreaterThan(0)
  })
})
