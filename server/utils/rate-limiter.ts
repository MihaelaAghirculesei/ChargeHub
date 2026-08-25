export interface RateLimitStatus {
  blocked: boolean
  retryAfterSeconds: number
}

interface Bucket {
  count: number
  windowStart: number
}

/**
 * Finestra fissa in memoria, per chiave (qui: IP del chiamante). **Stato per
 * istanza del processo, non condiviso**: su un deploy serverless (Vercel,
 * vedi ADR-0002/0003) più istanze a freddo possono girare in parallelo, e
 * ognuna riparte con contatori vuoti — non è un limite globale rigido, solo
 * un rallentamento onesto contro un brute force su un'istanza calda. Uno
 * store distribuito (Redis/KV) darebbe una garanzia vera, ma introdurrebbe
 * un backend reale — esplicitamente fuori scope per questo progetto (login
 * mock, vedi README). `maxSize` limita la memoria occupata in caso di
 * attacco da molti IP diversi: evizione del bucket più vecchio, non un vero
 * LRU (inutile per questo volume, la mappa resta comunque piccola in pratica).
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

  return {
    status(key: string, now = Date.now()): RateLimitStatus {
      const bucket = currentBucket(key, now)
      if (!bucket || bucket.count < options.maxAttempts) {
        return { blocked: false, retryAfterSeconds: 0 }
      }
      return {
        blocked: true,
        retryAfterSeconds: Math.ceil((bucket.windowStart + options.windowMs - now) / 1000)
      }
    },

    recordFailure(key: string, now = Date.now()): void {
      const bucket = currentBucket(key, now)
      if (bucket) {
        bucket.count += 1
        return
      }
      if (buckets.size >= maxSize) {
        const oldestKey = buckets.keys().next().value
        if (oldestKey !== undefined) buckets.delete(oldestKey)
      }
      buckets.set(key, { count: 1, windowStart: now })
    },

    recordSuccess(key: string): void {
      buckets.delete(key)
    }
  }
}

/** 5 tentativi falliti al minuto per IP — abbastanza per un typo, non per uno script. */
export const loginRateLimiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 5 })
