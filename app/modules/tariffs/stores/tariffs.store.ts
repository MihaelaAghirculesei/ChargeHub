import { tariffInputSchema, type Tariff, type TariffInput } from '~/modules/tariffs/domain/tariff'

const TARIFFS_COOKIE_NAME = 'chargehub-tariffs'

/**
 * Persistenza via `useCookie`, come dark mode (Giorno 2) e filtri stazioni
 * (Giorno 4) — nessuna dipendenza nuova (es. `pinia-plugin-persistedstate`)
 * per uno store che deve solo sopravvivere al reload di un browser.
 */
function useTariffsCookie() {
  return useCookie<Tariff[]>(TARIFFS_COOKIE_NAME, {
    default: () => [],
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
}

/**
 * CRUD tariffe interamente locale (nessun server coinvolto, a differenza di
 * ogni altro store del progetto): `tariffInputSchema` valida ogni
 * inserimento/modifica prima che entri nello stato, perché qui i dati
 * arrivano da un form compilato a mano, non da OCM già normalizzato.
 */
export const useTariffsStore = defineStore('tariffs', () => {
  const cookie = useTariffsCookie()
  const tariffs = ref<Tariff[]>(cookie.value)

  watch(
    tariffs,
    (value) => {
      cookie.value = value
    },
    { deep: true }
  )

  function add(input: TariffInput): Tariff {
    const parsed = tariffInputSchema.parse(input)
    const tariff: Tariff = { ...parsed, id: crypto.randomUUID() }
    tariffs.value = [...tariffs.value, tariff]
    return tariff
  }

  function update(id: string, input: TariffInput): void {
    const parsed = tariffInputSchema.parse(input)
    tariffs.value = tariffs.value.map((tariff) => (tariff.id === id ? { ...parsed, id } : tariff))
  }

  function remove(id: string): void {
    tariffs.value = tariffs.value.filter((tariff) => tariff.id !== id)
  }

  return { tariffs, add, update, remove }
})
