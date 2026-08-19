import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import KpiCard from '~/modules/analytics/components/KpiCard.vue'

describe('KpiCard', () => {
  it('mostra valore e unità formattati secondo il locale attivo', async () => {
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

  it('omette lo spazio prima dell’unità se questa è vuota', async () => {
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

  it('trend a zero: testo "invariato", nessun success/error', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { label: 'x', value: 1, unit: '', trendPercent: 0, higherIsBetter: true, series: [] }
    })

    expect(wrapper.text()).toContain('unverändert (7 Tage)')
    expect(wrapper.find('.text-success').exists()).toBe(false)
    expect(wrapper.find('.text-error').exists()).toBe(false)
  })

  it('trend positivo con higherIsBetter=true è una buona notizia (success)', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { label: 'x', value: 1, unit: '', trendPercent: 5.2, higherIsBetter: true, series: [] }
    })

    expect(wrapper.text()).toContain('+5.2% (7 Tage)')
    expect(wrapper.find('.text-success').exists()).toBe(true)
  })

  it('trend positivo con higherIsBetter=false è una cattiva notizia (error) — es. guasti in aumento', async () => {
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

  it('trend negativo con higherIsBetter=false è una buona notizia (success) — es. guasti in calo', async () => {
    const wrapper = await mountSuspended(KpiCard, {
      props: { label: 'x', value: 1, unit: '', trendPercent: -3, higherIsBetter: false, series: [] }
    })

    expect(wrapper.text()).toContain('-3.0% (7 Tage)')
    expect(wrapper.find('.text-success').exists()).toBe(true)
  })
})
