import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { createError } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { useStation } from '~/modules/stations/composables/useStation'

/**
 * `useAsyncData` (inside `useStation`) needs a real Nuxt app context —
 * same reason/pattern as `useStations.test.ts`. The id passed to
 * `useStation` is a host prop, so each test can use a different id (and one
 * test can change it after mount).
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
  it('exposes the station after the initial fetch', async () => {
    unregisterEndpoint = registerEndpoint('/api/stations/101', () => ({ id: 101, name: 'Rathaus' }))

    const wrapper = await mountSuspended(StationHost, { props: { id: 101 } })
    await flushPromises()

    expect(wrapper.vm.station).toEqual({ id: 101, name: 'Rathaus' })
    expect(wrapper.vm.pending).toBe(false)
    expect(wrapper.vm.error).toBeFalsy()
  })

  it('exposes null when the station does not exist, without throwing', async () => {
    // The real contract is "the server responds 404, the repository
    // translates it to null" (day 4, already tested there) — here we
    // simulate the real server behaviour (throw 404), not a 200 with a
    // `null` body, which is not how /api/stations/:id actually behaves.
    unregisterEndpoint = registerEndpoint('/api/stations/999999', () => {
      throw createError({ statusCode: 404, statusMessage: 'Station not found.' })
    })

    const wrapper = await mountSuspended(StationHost, { props: { id: 999999 } })
    await flushPromises()

    expect(wrapper.vm.station).toBeNull()
    expect(wrapper.vm.error).toBeFalsy()
  })

  it('re-fetches when the id changes', async () => {
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
