/**
 * `true` se `query` compare (case-insensitive) in almeno uno dei campi
 * passati. Usata per il filtro di ricerca testuale di `GET /api/stations`:
 * OCM non offre una ricerca full-text nella sua API di ricerca geografica,
 * quindi il BFF la implementa qui sopra il risultato già cachato — stesso
 * principio di `server/utils/paginate.ts` per pagina/ordinamento.
 */
export function matchesText(fields: (string | null | undefined)[], query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return fields.some((field) => field?.toLowerCase().includes(needle))
}
