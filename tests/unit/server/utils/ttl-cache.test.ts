import { describe, expect, it } from 'vitest'
import { createTtlCache, nlSearchCacheKey } from '~~/server/utils/ttl-cache'

describe('createTtlCache', () => {
  it('restituisce il valore salvato finché la TTL non è scaduta', () => {
    const cache = createTtlCache<string>({ ttlMs: 1_000 })
    cache.set('k', 'v', 0)

    expect(cache.get('k', 500)).toBe('v')
  })

  it('scade il valore esattamente alla fine della TTL (lazy, sulla lettura)', () => {
    const cache = createTtlCache<string>({ ttlMs: 1_000 })
    cache.set('k', 'v', 0)

    expect(cache.get('k', 1_000)).toBeUndefined()
    // la lettura scaduta ha anche rimosso l'entry
    expect(cache.size).toBe(0)
  })

  it('un miss su chiave mai vista è undefined', () => {
    const cache = createTtlCache<string>({ ttlMs: 1_000 })

    expect(cache.get('assente', 0)).toBeUndefined()
  })

  it('set successivo sulla stessa chiave rinfresca valore e scadenza', () => {
    const cache = createTtlCache<string>({ ttlMs: 1_000 })
    cache.set('k', 'vecchio', 0)
    cache.set('k', 'nuovo', 900)

    expect(cache.get('k', 1_500)).toBe('nuovo')
    expect(cache.get('k', 1_901)).toBeUndefined()
  })

  it('tiene le chiavi separate', () => {
    const cache = createTtlCache<string>({ ttlMs: 1_000 })
    cache.set('a', '1', 0)
    cache.set('b', '2', 0)

    expect(cache.get('a', 0)).toBe('1')
    expect(cache.get('b', 0)).toBe('2')
  })

  it('oltre maxSize evince la entry inserita per prima', () => {
    const cache = createTtlCache<string>({ ttlMs: 10_000, maxSize: 2 })
    cache.set('a', '1', 0)
    cache.set('b', '2', 0)
    cache.set('c', '3', 0)

    expect(cache.get('a', 0)).toBeUndefined() // evinta
    expect(cache.get('b', 0)).toBe('2')
    expect(cache.get('c', 0)).toBe('3')
  })

  it('un refresh sposta la chiave in fondo: non viene evinta al posto di una più vecchia', () => {
    const cache = createTtlCache<string>({ ttlMs: 10_000, maxSize: 2 })
    cache.set('a', '1', 0)
    cache.set('b', '2', 0)
    cache.set('a', '1-bis', 1) // 'a' ringiovanisce
    cache.set('c', '3', 2) // maxSize superato: deve cadere 'b', non 'a'

    expect(cache.get('a', 2)).toBe('1-bis')
    expect(cache.get('b', 2)).toBeUndefined()
    expect(cache.get('c', 2)).toBe('3')
  })
})

describe('nlSearchCacheKey', () => {
  it('normalizza case e spazi ai bordi così varianti banali collassano sulla stessa entry', () => {
    expect(nlSearchCacheKey('DE', '  Schneller CCS-Lader  ')).toBe(
      nlSearchCacheKey('de', 'schneller ccs-lader')
    )
  })

  it('separa per countrycode', () => {
    expect(nlSearchCacheKey('DE', 'ionity')).not.toBe(nlSearchCacheKey('NL', 'ionity'))
  })
})
