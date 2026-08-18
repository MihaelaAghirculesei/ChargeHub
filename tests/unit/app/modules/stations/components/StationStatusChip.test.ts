import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import StationStatusChip from '~/modules/stations/components/StationStatusChip.vue'

describe('StationStatusChip', () => {
  it('operativo: colore success, icona di conferma, testo del registro', async () => {
    const wrapper = await mountSuspended(StationStatusChip, {
      props: { isOperational: true, label: 'Operational' }
    })

    expect(wrapper.text()).toContain('Operational')
    expect(wrapper.find('.v-chip').classes()).toContain('bg-success')
    expect(wrapper.find('.mdi-check-circle').exists()).toBe(true)
  })

  it('non operativo: colore error, icona di allerta', async () => {
    const wrapper = await mountSuspended(StationStatusChip, {
      props: { isOperational: false, label: 'Not Operational' }
    })

    expect(wrapper.find('.v-chip').classes()).toContain('bg-error')
    expect(wrapper.find('.mdi-alert-circle').exists()).toBe(true)
  })

  it('sconosciuto (null): colore neutro, icona interrogativo — mai un colore a caso', async () => {
    const wrapper = await mountSuspended(StationStatusChip, {
      props: { isOperational: null, label: 'Planned for Future Date' }
    })

    expect(wrapper.find('.v-chip').classes()).toContain('bg-surface-variant')
    expect(wrapper.find('.mdi-help-circle').exists()).toBe(true)
  })

  it('lo stato non è mai comunicato dal solo colore: testo sempre presente', async () => {
    const wrapper = await mountSuspended(StationStatusChip, {
      props: { isOperational: true, label: 'Operational' }
    })

    expect(wrapper.text().trim().length).toBeGreaterThan(0)
  })
})
