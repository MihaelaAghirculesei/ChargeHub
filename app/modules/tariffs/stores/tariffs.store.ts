import { tariffInputSchema, type Tariff, type TariffInput } from '~/modules/tariffs/domain/tariff'

const TARIFFS_COOKIE_NAME = 'chargehub-tariffs'

/**
 * Persistence via `useCookie`, like dark mode (day 2) and station filters
 * (day 4) — no new dependency (e.g. `pinia-plugin-persistedstate`) for a
 * store that only needs to survive a browser reload.
 */
function useTariffsCookie() {
  return useCookie<Tariff[]>(TARIFFS_COOKIE_NAME, {
    default: () => [],
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  })
}

/**
 * Fully local tariff CRUD (no server involved, unlike every other store in
 * the project): `tariffInputSchema` validates every insert/edit before it
 * enters the state, because here the data comes from a hand-filled form,
 * not from already-normalised OCM.
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
