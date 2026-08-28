import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import KpiCard from '~/modules/analytics/components/KpiCard.vue'

describe('KpiCard', () => {
  it('shows value and unit formatted per the active locale', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: {
        label: 'Stationen',
        value: 1234.5,
        unit: 'kWh',
        trendPercent: 0,
        higherIsBetter: true,
        series: []
      }
    })

    expect(wrapper.text()).toContain('1.234,5 kWh')
  })

  it('omits the space before the unit if it is empty', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: {
        label: 'Stationen',
        value: 42,
        unit: '',
        trendPercent: 0,
        higherIsBetter: true,
        series: []
      }
    })

    expect(wrapper.text()).toContain('42')
    expect(wrapper.text()).not.toMatch(/42 /)
  })

  it('zero trend: "unchanged" text, no success/error', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { label: 'x', value: 1, unit: '', trendPercent: 0, higherIsBetter: true, series: [] }
    })

    expect(wrapper.text()).toContain('unverändert (7 Tage)')
    expect(wrapper.find('.text-success').exists()).toBe(false)
    expect(wrapper.find('.text-error').exists()).toBe(false)
  })

  it('a positive trend with higherIsBetter=true is good news (success)', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { label: 'x', value: 1, unit: '', trendPercent: 5.2, higherIsBetter: true, series: [] }
    })

    expect(wrapper.text()).toContain('+5.2% (7 Tage)')
    expect(wrapper.find('.text-success').exists()).toBe(true)
  })

  it('a positive trend with higherIsBetter=false is bad news (error) — e.g. faults rising', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: {
        label: 'x',
        value: 1,
        unit: '',
        trendPercent: 5.2,
        higherIsBetter: false,
        series: []
      }
    })

    expect(wrapper.find('.text-error').exists()).toBe(true)
    expect(wrapper.find('.text-success').exists()).toBe(false)
  })

  it('a negative trend with higherIsBetter=false is good news (success) — e.g. faults falling', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { label: 'x', value: 1, unit: '', trendPercent: -3, higherIsBetter: false, series: [] }
    })

    expect(wrapper.text()).toContain('-3.0% (7 Tage)')
    expect(wrapper.find('.text-success').exists()).toBe(true)
  })
})
