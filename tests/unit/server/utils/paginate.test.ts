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
  it('slices the requested page and reports the total over the whole array, not the page', () => {
    const page = paginate(items, { page: 1, itemsPerPage: 2 })

    expect(page.items).toEqual([items[0], items[1]])
    expect(page.total).toBe(4)
  })

  it('returns an empty array past the last page, with no errors', () => {
    const page = paginate(items, { page: 10, itemsPerPage: 2 })

    expect(page.items).toEqual([])
    expect(page.total).toBe(4)
  })

  it('without sortBy keeps the original order', () => {
    const page = paginate(items, { page: 1, itemsPerPage: 10 })

    expect(page.items.map((item) => item.name)).toEqual(['Charlie', 'Alpha', 'Bravo', 'Delta'])
  })

  it('sorts ascending/descending based on sortOrder', () => {
    const asc = paginate(items, { page: 1, itemsPerPage: 10, sortBy: 'name' }, (item) => item.name)
    const desc = paginate(
      items,
      { page: 1, itemsPerPage: 10, sortBy: 'name', sortOrder: 'desc' },
      (item) => item.name
    )

    expect(asc.items.map((item) => item.name)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta'])
    expect(desc.items.map((item) => item.name)).toEqual(['Delta', 'Charlie', 'Bravo', 'Alpha'])
  })

  it('always sends null values to the end, regardless of direction', () => {
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

  it('paginates the already-sorted result, not the raw result', () => {
    const page = paginate(items, { page: 2, itemsPerPage: 2, sortBy: 'name' }, (item) => item.name)

    expect(page.items.map((item) => item.name)).toEqual(['Charlie', 'Delta'])
  })
})
