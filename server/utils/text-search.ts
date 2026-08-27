/**
 * `true` if `query` appears (case-insensitive) in at least one of the
 * fields passed. Used for the text-search filter of `GET /api/stations`:
 * OCM offers no full-text search in its geographic search API, so the BFF
 * implements it here on top of the already-cached result — same principle
 * as `server/utils/paginate.ts` for page/sort.
 */
export function matchesText(fields: (string | null | undefined)[], query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return fields.some((field) => field?.toLowerCase().includes(needle))
}
