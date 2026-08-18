import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { createError } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { useStation } from '~/modules/stations/composables/useStation'

/**
 * `useAsyncData` (dentro `useStation`) richiede un contesto app Nuxt vero —
 * stesso motivo/pattern di `useStations.test.ts`. L'id passato a
 * `useStation` è un prop dell'host, così ogni test può usare un id diverso
 * (e uno dei test può cambiarlo dopo il mount).
 */
const StationHost = defineComponent({
  props: { id: { type: Number, required: true } },
  setup(props) {
    return useStation(() => props.id)
  },
  template: '<div />'
})

let unregisterEndpoint: (() => void) | undefined
afterEach(() => {
  unregisterEndpoint?.()
  unregisterEndpoint = undefined
})

describe('useStation', () => {
  it('espone la stazione dopo il fetch iniziale', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/101', () => ({ id: 101, name: 'Rathaus' }))

    const wrapper = await mountSuspended(StationHost, { props: { id: 101 } })
    await flushPromises()

    expect(wrapper.vm.station).toEqual({ id: 101, name: 'Rathaus' })
    expect(wrapper.vm.pending).toBe(false)
    expect(wrapper.vm.error).toBeFalsy()
  })

  it('espone null quando la stazione non esiste, senza lanciare', async () => {
    // Il contratto reale è "il server risponde 404, il repository lo
    // traduce in null" (Giorno 4, già testato lì) — qui simuliamo il vero
    // comportamento server (throw 404), non un 200 con body `null`, che non
    // è come /api/stations/:id si comporta davvero.
    unregisterEndpoint = registerEndpoint('/api/stations/999999', () => {
      throw createError({ statusCode: 404, statusMessage: 'Stazione non trovata.' })
    })

    const wrapper = await mountSuspended(StationHost, { props: { id: 999999 } })
    await flushPromises()

    expect(wrapper.vm.station).toBeNull()
    expect(wrapper.vm.error).toBeFalsy()
  })

  it('rifetcha quando l’id cambia', async () => {
    const unregisterFirst = registerEndpoint('/api/stations/202', () => ({
      id: 202,
      name: 'Station 202'
    }))
    const unregisterSecond = registerEndpoint('/api/stations/303', () => ({
      id: 303,
      name: 'Station 303'
    }))
    unregisterEndpoint = () => {
      unregisterFirst()
      unregisterSecond()
    }

    const wrapper = await mountSuspended(StationHost, { props: { id: 202 } })
    await flushPromises()
    expect(wrapper.vm.station).toEqual({ id: 202, name: 'Station 202' })

    await wrapper.setProps({ id: 303 })
    await nextTick()
    await flushPromises()
    await nextTick()
    await flushPromises()
    expect(wrapper.vm.station).toEqual({ id: 303, name: 'Station 303' })
  })
})
