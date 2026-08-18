import { describe, expect, it } from 'vitest'
import { paginate } from '~~/server/utils/paginate'

interface Item {
  name: string
  power: number | null
}

const items: Item[] = [
  { name: 'Charlie', power: 22 },
  { name: 'Alpha', power: null },
  { name: 'Bravo', power: 50 },
  { name: 'Delta', power: 11 }
]

describe('paginate', () => {
  it('affetta la pagina richiesta e riporta il totale su tutto l’array, non sulla pagina', () => {
    const page = paginate(items, { page: 1, itemsPerPage: 2 })

    expect(page.items).toEqual([items[0], items[1]])
    expect(page.total).toBe(4)
  })

  it('restituisce un array vuoto oltre l’ultima pagina, senza errori', () => {
    const page = paginate(items, { page: 10, itemsPerPage: 2 })

    expect(page.items).toEqual([])
    expect(page.total).toBe(4)
  })

  it('senza sortBy mantiene l’ordine originale', () => {
    const page = paginate(items, { page: 1, itemsPerPage: 10 })

    expect(page.items.map((item) => item.name)).toEqual(['Charlie', 'Alpha', 'Bravo', 'Delta'])
  })

  it('ordina ascendente/discendente in base a sortOrder', () => {
    const asc = paginate(items, { page: 1, itemsPerPage: 10, sortBy: 'name' }, (item) => item.name)
    const desc = paginate(
      items,
      { page: 1, itemsPerPage: 10, sortBy: 'name', sortOrder: 'desc' },
      (item) => item.name
    )

    expect(asc.items.map((item) => item.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta'])
    expect(desc.items.map((item) => item.name)).toEqual(['Delta', 'Charlie', 'Bravo', 'Alpha'])
  })

  it('manda sempre i valori null in coda, indipendentemente dal verso', () => {
    const asc = paginate(
      items,
      { page: 1, itemsPerPage: 10, sortBy: 'power' },
      (item) => item.power
    )
    const desc = paginate(
      items,
      { page: 1, itemsPerPage: 10, sortBy: 'power', sortOrder: 'desc' },
      (item) => item.power
    )

    expect(asc.items.at(-1)?.name).toBe('Alpha')
    expect(desc.items.at(-1)?.name).toBe('Alpha')
  })

  it('pagina il risultato già ordinato, non il risultato grezzo', () => {
    const page = paginate(items, { page: 2, itemsPerPage: 2, sortBy: 'name' }, (item) => item.name)

    expect(page.items.map((item) => item.name)).toEqual(['Charlie', 'Delta'])
  })
})
