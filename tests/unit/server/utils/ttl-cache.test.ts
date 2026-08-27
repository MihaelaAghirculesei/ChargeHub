import { describe, expect, it } from 'vitest'
import { createTtlCache, nlSearchCacheKey } from '~~/server/utils/ttl-cache'

describe('createTtlCache', () => {
  it('returns the stored value until the TTL has expired', () => {
    const cache = createTtlCache<string>({ ttlMs: 1_000 })
    cache.set('k', 'v', 0)

    expect(cache.get('k', 500)).toBe('v')
  })

  it('expires the value exactly at the end of the TTL (lazy, on read)', () => {
    const cache = createTtlCache<string>({ ttlMs: 1_000 })
    cache.set('k', 'v', 0)

    expect(cache.get('k', 1_000)).toBeUndefined()
    // the expired read also removed the entry
    expect(cache.size).toBe(0)
  })

  it('a miss on a never-seen key is undefined', () => {
    const cache = createTtlCache<string>({ ttlMs: 1_000 })

    expect(cache.get('absent', 0)).toBeUndefined()
  })

  it('a later set on the same key refreshes value and expiry', () => {
    const cache = createTtlCache<string>({ ttlMs: 1_000 })
    cache.set('k', 'old', 0)
    cache.set('k', 'new', 900)

    expect(cache.get('k', 1_500)).toBe('new')
    expect(cache.get('k', 1_901)).toBeUndefined()
  })

  it('keeps keys separate', () => {
    const cache = createTtlCache<string>({ ttlMs: 1_000 })
    cache.set('a', '1', 0)
    cache.set('b', '2', 0)

    expect(cache.get('a', 0)).toBe('1')
    expect(cache.get('b', 0)).toBe('2')
  })

  it('past maxSize it evicts the first-inserted entry', () => {
    const cache = createTtlCache<string>({ ttlMs: 10_000, maxSize: 2 })
    cache.set('a', '1', 0)
    cache.set('b', '2', 0)
    cache.set('c', '3', 0)

    expect(cache.get('a', 0)).toBeUndefined() // evicted
    expect(cache.get('b', 0)).toBe('2')
    expect(cache.get('c', 0)).toBe('3')
  })

  it('a refresh moves the key to the back: it is not evicted ahead of an older one', () => {
    const cache = createTtlCache<string>({ ttlMs: 10_000, maxSize: 2 })
    cache.set('a', '1', 0)
    cache.set('b', '2', 0)
    cache.set('a', '1-again', 1) // 'a' is rejuvenated
    cache.set('c', '3', 2) // maxSize exceeded: 'b' must fall, not 'a'

    expect(cache.get('a', 2)).toBe('1-again')
    expect(cache.get('b', 2)).toBeUndefined()
    expect(cache.get('c', 2)).toBe('3')
  })
})

describe('nlSearchCacheKey', () => {
  it('normalises case and edge whitespace so trivial variants collapse onto the same entry', () => {
    expect(nlSearchCacheKey('DE', '  Schneller CCS-Lader  ')).toBe(
      nlSearchCacheKey('de', 'schneller ccs-lader')
    )
  })

  it('separates by countrycode', () => {
    expect(nlSearchCacheKey('DE', 'ionity')).not.toBe(nlSearchCacheKey('NL', 'ionity'))
  })
})
