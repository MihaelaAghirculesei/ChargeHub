import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Tariff } from '~/modules/tariffs/domain/tariff'
import { useTariffsStore } from '~/modules/tariffs/stores/tariffs.store'

function validInput() {
  return { name: 'Standard', pricePerKwh: 0.45, blockingFeePerMinute: 0.1, monthlyFeeEur: 9.99 }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

// The "nuxt" env reuses a single cookie (same "ambient app" as
// useRoute/useAsyncData, see docs/PROGRESS.md) for the whole file: without
// cleanup, the tariffs added by one test would remain in the cookie read
// by the next test.
afterEach(() => {
  useCookie<Tariff[]>('chargehub-tariffs').value = []
})

describe('useTariffsStore', () => {
  it('starts with no tariffs', () => {
    const store = useTariffsStore()
    expect(store.tariffs).toEqual([])
  })

  it('add validates the input, assigns an id and adds it to the state', () => {
    const store = useTariffsStore()

    const tariff = store.add(validInput())

    expect(tariff.id).toBeTruthy()
    expect(tariff.name).toBe('Standard')
    expect(store.tariffs).toHaveLength(1)
    expect(store.tariffs[0]).toEqual(tariff)
  })

  it('add rejects an invalid input (same validation as the domain schema)', () => {
    const store = useTariffsStore()
    expect(() => store.add({ ...validInput(), name: '' })).toThrow()
    expect(store.tariffs).toHaveLength(0)
  })

  it('update replaces the fields keeping the same id', () => {
    const store = useTariffsStore()
    const tariff = store.add(validInput())

    store.update(tariff.id, { ...validInput(), name: 'Premium', pricePerKwh: 0.6 })

    expect(store.tariffs).toHaveLength(1)
    expect(store.tariffs[0]).toMatchObject({ id: tariff.id, name: 'Premium', pricePerKwh: 0.6 })
  })

  it('remove removes only the given tariff', () => {
    const store = useTariffsStore()
    const first = store.add(validInput())
    const second = store.add({ ...validInput(), name: 'Zweite' })

    store.remove(first.id)

    expect(store.tariffs).toHaveLength(1)
    expect(store.tariffs[0]?.id).toBe(second.id)
  })

  it('two different tariffs get different ids', () => {
    const store = useTariffsStore()
    const first = store.add(validInput())
    const second = store.add(validInput())
    expect(first.id).not.toBe(second.id)
  })
})
