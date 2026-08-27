import { describe, expect, it } from 'vitest'
import {
  NL_SEARCH_DAILY_CAP_KEY,
  createRateLimiter,
  nlSearchDailyCap
} from '~~/server/utils/rate-limiter'

describe('createRateLimiter', () => {
  it('allows up to maxAttempts attempts, then blocks', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 3 })
    const now = 0

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(limiter.reserve('1.2.3.4', now).blocked).toBe(false)
    }

    expect(limiter.reserve('1.2.3.4', now).blocked).toBe(true)
  })

  it('reports the remaining wait until the end of the window', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.reserve('1.2.3.4', 0)

    expect(limiter.status('1.2.3.4', 45_000).retryAfterSeconds).toBe(15)
  })

  it('unblocks itself once the window has expired', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.reserve('1.2.3.4', 0)

    expect(limiter.status('1.2.3.4', 60_000).blocked).toBe(false)
  })

  it('a success resets the counter, regardless of previous attempts', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 2 })
    limiter.reserve('1.2.3.4', 0)
    limiter.reserve('1.2.3.4', 1_000)
    limiter.recordSuccess('1.2.3.4')

    expect(limiter.status('1.2.3.4', 2_000).blocked).toBe(false)
  })

  it('release() gives back exactly one reserved attempt, without going below zero', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 2 })
    limiter.reserve('k', 0)
    limiter.reserve('k', 0)
    expect(limiter.status('k', 0).blocked).toBe(true)

    limiter.release('k', 0)
    expect(limiter.status('k', 0).blocked).toBe(false) // back under the threshold
    expect(limiter.reserve('k', 0).blocked).toBe(false) // and there is room for another

    limiter.release('k', 0)
    limiter.release('k', 0)
    limiter.release('k', 0) // extra releases past zero: must not go negative
    limiter.reserve('k', 0)
    limiter.reserve('k', 0)
    expect(limiter.reserve('k', 0).blocked).toBe(true) // still a threshold of 2, not "unlocked" by a negative count
  })

  it('release() is a no-op when the window has already expired (no live bucket)', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.reserve('k', 0)
    limiter.release('k', 60_001)

    // New window: the counter restarts from zero anyway, the release did not
    // "gift" an attempt to the old window nor to the new one.
    expect(limiter.reserve('k', 60_001).blocked).toBe(false)
    expect(limiter.reserve('k', 60_001).blocked).toBe(true)
  })

  it('keeps counters separate per key', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1 })
    limiter.reserve('1.2.3.4', 0)

    expect(limiter.status('1.2.3.4', 0).blocked).toBe(true)
    expect(limiter.status('5.6.7.8', 0).blocked).toBe(false)
  })

  it('avoids unbounded map growth: past maxSize it evicts the oldest bucket', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1, maxSize: 2 })
    limiter.reserve('a', 0)
    limiter.reserve('b', 0)
    limiter.reserve('c', 0)

    // 'a' was the oldest: evicted to make room for 'c', hence unblocked again.
    expect(limiter.status('a', 0).blocked).toBe(false)
    expect(limiter.status('b', 0).blocked).toBe(true)
    expect(limiter.status('c', 0).blocked).toBe(true)
  })

  it('reserve() checks and increments in a single synchronous call: N consecutive calls block exactly at the Nth', () => {
    // Covers a real bug found in code review: a check and an increment
    // separated by an `await` (status() then recordFailure() after reading
    // the body) let more concurrent attempts than maxAttempts through,
    // because neither call incremented the counter straight away.
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 5 })
    const results = Array.from({ length: 6 }, () => limiter.reserve('1.2.3.4', 0).blocked)

    expect(results).toEqual([false, false, false, false, false, true])
  })

  it('a bucket reactivated after its window expired is not evicted ahead of a genuinely older one', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, maxAttempts: 1, maxSize: 2 })
    limiter.reserve('old', 0)
    limiter.reserve('other', 1)
    limiter.reserve('old', 60_001) // window expired, it reactivates: must be "rejuvenated" in order
    limiter.reserve('newest', 60_001) // maxSize=2 exceeded: must evict 'other', not the just-reactivated 'old'

    expect(limiter.status('old', 60_001).blocked).toBe(true)
    expect(limiter.status('other', 60_001).blocked).toBe(false)
  })
})

describe('nlSearchDailyCap (global daily ceiling, ADR-0007)', () => {
  // Module singleton: an isolated time window (`base`) far from 0 so this
  // block does not interfere with any other test in the file and vice versa
  // — the bucket stays full only inside its own simulated 24h.
  const base = 10_000_000_000

  it('blocks past 200 searches a day summing all callers together, not per IP', () => {
    for (let call = 0; call < 200; call += 1) {
      expect(nlSearchDailyCap.reserve(NL_SEARCH_DAILY_CAP_KEY, base).blocked).toBe(false)
    }

    expect(nlSearchDailyCap.reserve(NL_SEARCH_DAILY_CAP_KEY, base).blocked).toBe(true)
  })

  it('resets after 24h', () => {
    expect(nlSearchDailyCap.status(NL_SEARCH_DAILY_CAP_KEY, base + 86_400_000).blocked).toBe(false)
  })
})
