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

// L'ambiente "nuxt" riusa un singolo cookie (stesso "ambient app" di
// useRoute/useAsyncData, vedi docs/PROGRESS.md) per tutto il file: senza
// pulizia, le tariffe aggiunte da un test resterebbero nel cookie letto dal
// test successivo.
afterEach(() => {
  useCookie<Tariff[]>('chargehub-tariffs').value = []
})

describe('useTariffsStore', () => {
  it('parte senza tariffe', () => {
    const store = useTariffsStore()
    expect(store.tariffs).toEqual([])
  })

  it("add valida l'input, assegna un id e lo aggiunge allo stato", () => {
    const store = useTariffsStore()

    const tariff = store.add(validInput())

    expect(tariff.id).toBeTruthy()
    expect(tariff.name).toBe('Standard')
    expect(store.tariffs).toHaveLength(1)
    expect(store.tariffs[0]).toEqual(tariff)
  })

  it('add rifiuta un input non valido (stessa validazione dello schema di dominio)', () => {
    const store = useTariffsStore()
    expect(() => store.add({ ...validInput(), name: '' })).toThrow()
    expect(store.tariffs).toHaveLength(0)
  })

  it('update sostituisce i campi mantenendo lo stesso id', () => {
    const store = useTariffsStore()
    const tariff = store.add(validInput())

    store.update(tariff.id, { ...validInput(), name: 'Premium', pricePerKwh: 0.6 })

    expect(store.tariffs).toHaveLength(1)
    expect(store.tariffs[0]).toMatchObject({ id: tariff.id, name: 'Premium', pricePerKwh: 0.6 })
  })

  it('remove toglie solo la tariffa indicata', () => {
    const store = useTariffsStore()
    const first = store.add(validInput())
    const second = store.add({ ...validInput(), name: 'Zweite' })

    store.remove(first.id)

    expect(store.tariffs).toHaveLength(1)
    expect(store.tariffs[0]?.id).toBe(second.id)
  })

  it('due tariffe diverse ottengono id diversi', () => {
    const store = useTariffsStore()
    const first = store.add(validInput())
    const second = store.add(validInput())
    expect(first.id).not.toBe(second.id)
  })
})
