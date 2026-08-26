export interface RateLimitStatus {
  blocked: boolean
  retryAfterSeconds: number
}

interface Bucket {
  count: number
  windowStart: number
}

/**
 * Fixed window in memory, per key (here: caller IP). **State is per process
 * instance, not shared**: on a serverless deploy (Vercel, see
 * ADR-0002/0003) multiple cold instances can run in parallel, each starting
 * with empty counters — not a hard global limit, just an honest slowdown
 * against a brute force hitting one warm instance. A distributed store
 * (Redis/KV) would give a real guarantee, but that means a real backend —
 * explicitly out of scope for this project (login mock, see README).
 * `maxSize` bounds memory if an attack comes from many different IPs:
 * evicts the oldest bucket, not a true LRU (unnecessary at this volume, the
 * map stays small in practice). Refreshing an existing key re-inserts it
 * (`delete` + `set`) so it moves to the newest position — otherwise a
 * just-reactivated bucket could be picked as "oldest" and evicted ahead of
 * a genuinely stale one, just because of when it first appeared.
 */
export function createRateLimiter(options: {
  windowMs: number
  maxAttempts: number
  maxSize?: number
}) {
  const buckets = new Map<string, Bucket>()
  const maxSize = options.maxSize ?? 10_000

  function currentBucket(key: string, now: number): Bucket | undefined {
    const bucket = buckets.get(key)
    if (!bucket || now - bucket.windowStart >= options.windowMs) return undefined
    return bucket
  }

  function blockedStatus(bucket: Bucket, now: number): RateLimitStatus {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((bucket.windowStart + options.windowMs - now) / 1000)
    }
  }

  return {
    /** Read-only peek: does not count as an attempt. */
    status(key: string, now = Date.now()): RateLimitStatus {
      const bucket = currentBucket(key, now)
      if (!bucket || bucket.count < options.maxAttempts) {
        return { blocked: false, retryAfterSeconds: 0 }
      }
      return blockedStatus(bucket, now)
    },

    /**
     * Checks and increments in one synchronous call — no `await` in
     * between, so no concurrent request can interleave (Node's event loop
     * only yields at an `await`). Must be called before any `await` in the
     * caller, right when the request comes in. A prior version split this
     * into a `status()` check and a separate `recordFailure()` call after
     * an `await readValidatedBody(...)` — concurrent requests from the
     * same key all passed the check before any of them had incremented the
     * counter, letting more than `maxAttempts` through per window.
     */
    reserve(key: string, now = Date.now()): RateLimitStatus {
      const bucket = currentBucket(key, now)
      if (bucket && bucket.count >= options.maxAttempts) {
        return blockedStatus(bucket, now)
      }

      if (bucket) {
        bucket.count += 1
      } else {
        buckets.delete(key)
        if (buckets.size >= maxSize) {
          const oldestKey = buckets.keys().next().value
          if (oldestKey !== undefined) buckets.delete(oldestKey)
        }
        buckets.set(key, { count: 1, windowStart: now })
      }
      return { blocked: false, retryAfterSeconds: 0 }
    },

    recordSuccess(key: string): void {
      buckets.delete(key)
    },

    /**
     * Give one reserved attempt back. The NL-search route uses this to
     * refund a daily-cap slot when the Claude call failed with a provider
     * error (`Anthropic.APIError` — the request was rejected, not billed),
     * so a transient upstream outage cannot drain the global daily budget
     * with zero successful extractions. No-op if the window has already
     * rolled over or the counter is already at zero. Not the inverse of
     * `recordSuccess()`, which clears the whole bucket.
     */
    release(key: string, now = Date.now()): void {
      const bucket = currentBucket(key, now)
      if (bucket && bucket.count > 0) bucket.count -= 1
    }
  }
}

/** 5 failed attempts per minute per IP — enough for a typo, not for a script. */
export const loginRateLimiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 5 })

/**
 * 10 searches per minute per IP — each one is a real (small) Claude API
 * cost, not just a login check. Generous enough for normal interactive use
 * (typing, refining a query), low enough to bound the worst case if a
 * script hammers the endpoint. See ADR-0007.
 */
export const nlSearchRateLimiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 10 })

/**
 * Global daily ceiling on Claude-backed searches, across **all** callers
 * together — not per IP. The per-IP limiter above does nothing against a
 * burst spread over many IPs, and on serverless each cold instance starts
 * its per-IP counters from zero (same caveat as the class doc above). This
 * is one shared bucket ("no more than N NL searches per day, in total"),
 * reusing the same fixed-window primitive with a single constant key.
 *
 * Same honesty as every limiter here: in-memory, per process instance, so
 * on a multi-instance deploy the real ceiling is N × instances, not N. It
 * is a blast-radius reducer, not a spend guarantee — the hard cap is the
 * spend limit set on the dedicated Anthropic workspace (see .env.example
 * and ADR-0007), which no code path can exceed. 200/day leaves generous
 * headroom over real portfolio traffic; tune it against actual usage, the
 * same way the Lighthouse thresholds were.
 */
export const nlSearchDailyCap = createRateLimiter({ windowMs: 86_400_000, maxAttempts: 200 })

/** Single constant key for {@link nlSearchDailyCap}: the bucket is global, not per-caller. */
export const NL_SEARCH_DAILY_CAP_KEY = 'nl-search'
