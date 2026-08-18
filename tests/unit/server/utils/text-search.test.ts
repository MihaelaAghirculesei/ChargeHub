import { describe, expect, it } from 'vitest'
import { matchesText } from '~~/server/utils/text-search'

describe('matchesText', () => {
  it('trova una corrispondenza case-insensitive in uno qualunque dei campi', () => {
    expect(matchesText(['Rathaus', 'Stadtwerke', 'Wolfsburg'], 'stadt')).toBe(true)
    expect(matchesText(['Rathaus', 'Stadtwerke', 'Wolfsburg'], 'WOLFSBURG')).toBe(true)
  })

  it('restituisce false quando nessun campo contiene la query', () => {
    expect(matchesText(['Rathaus', 'Stadtwerke', 'Wolfsburg'], 'München')).toBe(false)
  })

  it('ignora i campi null/undefined invece di lanciare', () => {
    expect(matchesText([null, undefined, 'Wolfsburg'], 'wolfsburg')).toBe(true)
    expect(matchesText([null, undefined], 'wolfsburg')).toBe(false)
  })

  it('una query vuota o di soli spazi corrisponde sempre', () => {
    expect(matchesText(['Rathaus'], '')).toBe(true)
    expect(matchesText(['Rathaus'], '   ')).toBe(true)
    expect(matchesText([], '')).toBe(true)
  })

  it('ignora gli spazi ai lati della query', () => {
    expect(matchesText(['Rathaus'], '  rathaus  ')).toBe(true)
  })
})
