export interface PageOptions<SortKey extends string> {
  page: number
  itemsPerPage: number
  sortBy?: SortKey
  sortOrder?: 'asc' | 'desc'
}

export interface Page<Item> {
  items: Item[]
  total: number
}

/**
 * Paginates and sorts an array already in memory. Used by
 * `GET /api/stations`: OCM offers no pagination/sorting in its geographic
 * search API, so the BFF implements them here on top of the full result
 * (already cached 24h by `fetchStations`), instead of re-querying OCM for
 * each page — a single upstream fetch serves all pages.
 */
export function paginate<Item, SortKey extends string>(
  items: readonly Item[],
  options: PageOptions<SortKey>,
  getSortValue?: (item: Item, sortBy: SortKey) => string | number | null
): Page<Item> {
  let sorted = items
  if (options.sortBy && getSortValue) {
    const sortBy = options.sortBy
    const direction = options.sortOrder === 'desc' ? -1 : 1
    sorted = [...items].sort((a, b) => {
      const valueA = getSortValue(a, sortBy)
      const valueB = getSortValue(b, sortBy)
      // Null values always go to the end, regardless of sort direction:
      // "no data" is neither the smallest nor the largest, it is an absence.
      if (valueA === valueB) return 0
      if (valueA === null) return 1
      if (valueB === null) return -1
      return valueA < valueB ? -direction : direction
    })
  }

  const start = (options.page - 1) * options.itemsPerPage
  return {
    items: sorted.slice(start, start + options.itemsPerPage),
    total: items.length
  }
}
