import { describe, expect, it } from 'vitest'
import { matchesText } from '~~/server/utils/text-search'

describe('matchesText', () => {
  it('finds a case-insensitive match in any of the fields', () => {
    expect(matchesText(['Rathaus', 'Stadtwerke', 'Wolfsburg'], 'stadt')).toBe(true)
    expect(matchesText(['Rathaus', 'Stadtwerke', 'Wolfsburg'], 'WOLFSBURG')).toBe(true)
  })

  it('returns false when no field contains the query', () => {
    expect(matchesText(['Rathaus', 'Stadtwerke', 'Wolfsburg'], 'München')).toBe(false)
  })

  it('ignores null/undefined fields instead of throwing', () => {
    expect(matchesText([null, undefined, 'Wolfsburg'], 'wolfsburg')).toBe(true)
    expect(matchesText([null, undefined], 'wolfsburg')).toBe(false)
  })

  it('an empty or whitespace-only query always matches', () => {
    expect(matchesText(['Rathaus'], '')).toBe(true)
    expect(matchesText(['Rathaus'], '   ')).toBe(true)
    expect(matchesText([], '')).toBe(true)
  })

  it('ignores whitespace on the edges of the query', () => {
    expect(matchesText(['Rathaus'], '  rathaus  ')).toBe(true)
  })
})
