/**
 * Tiny in-memory cache with a fixed per-entry TTL and a bounded size.
 * Deliberately hand-rolled in the same shape as {@link createRateLimiter}
 * (rate-limiter.ts) rather than `defineCachedFunction` (ocm-client.ts): the
 * caller needs to tell a hit from a miss *before* deciding whether to spend
 * a Claude call or a daily-cap slot, which the nitro cache wrapper hides.
 *
 * **State is per process instance, not shared** — on a serverless deploy
 * (ADR-0002/0003) each cold instance starts empty. That is fine here: the
 * job is to swallow a burst of identical queries hitting one warm instance
 * (a script, an impatient retry loop), not to be a durable store. A cache
 * miss just means one more upstream call, never a wrong answer.
 *
 * Expiry is lazy (checked on read). `maxSize` bounds memory if many
 * distinct keys come through: it evicts the oldest inserted entry, not a
 * true LRU — unnecessary at this volume, the map stays small in practice.
 */
export function createTtlCache<Value>(options: { ttlMs: number; maxSize?: number }) {
  interface Entry {
    value: Value
    expiresAt: number
  }

  const entries = new Map<string, Entry>()
  const maxSize = options.maxSize ?? 500

  return {
    get(key: string, now = Date.now()): Value | undefined {
      const entry = entries.get(key)
      if (!entry) return undefined
      if (now >= entry.expiresAt) {
        entries.delete(key)
        return undefined
      }
      return entry.value
    },

    set(key: string, value: Value, now = Date.now()): void {
      // Refresh in place: delete first so an existing key moves to the
      // newest insertion position and is not picked as "oldest" ahead of a
      // genuinely stale entry (same reasoning as the rate limiter's map).
      entries.delete(key)
      if (entries.size >= maxSize) {
        const oldestKey = entries.keys().next().value
        if (oldestKey !== undefined) entries.delete(oldestKey)
      }
      entries.set(key, { value, expiresAt: now + options.ttlMs })
    },

    /** Test/introspection helper — current live entry count (does not evict expired). */
    get size(): number {
      return entries.size
    }
  }
}

/**
 * Caches successful NL-search extractions keyed by `countrycode:query`
 * (query lower-cased + trimmed, so trivial variants collapse). 1h TTL:
 * long enough to absorb a burst or a retry loop, short enough that a
 * re-search after the 24h reference-data cache rolls over is not stale for
 * long. Only successful results are stored — an upstream error is never
 * cached. See ADR-0007.
 */
export const nlSearchCache = createTtlCache<
  import('#shared/schemas/station').ExtractedStationFilters
>({
  ttlMs: 60 * 60 * 1000
})

/** Build the {@link nlSearchCache} key. Exported so the route and its tests agree on the format. */
export function nlSearchCacheKey(countrycode: string, query: string): string {
  return `${countrycode.toLowerCase()}:${query.trim().toLowerCase()}`
}
