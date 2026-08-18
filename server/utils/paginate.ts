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
 * Pagina e ordina un array già in memoria. Usata da `GET /api/stations`:
 * OCM non offre paginazione/ordinamento nella sua API di ricerca geografica,
 * quindi il BFF li implementa qui sopra l'intero risultato (già cachato 24h
 * da `fetchStations`), invece di rifare una query a OCM per ogni pagina —
 * un solo fetch upstream serve tutte le pagine.
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
      // I valori nulli finiscono sempre in coda, indipendentemente dal verso
      // dell'ordinamento: "nessun dato" non è né il più piccolo né il più
      // grande, è un'assenza.
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
