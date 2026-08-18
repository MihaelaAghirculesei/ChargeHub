import { describe, expect, it } from 'vitest'
import { tariffInputSchema, tariffSchema } from '~/modules/tariffs/domain/tariff'

function validInput() {
  return { name: 'Standard', pricePerKwh: 0.45, blockingFeePerMinute: 0.1, monthlyFeeEur: 9.99 }
}

describe('tariffInputSchema', () => {
  it('accetta un input valido', () => {
    expect(tariffInputSchema.safeParse(validInput()).success).toBe(true)
  })

  it('rifiuta un nome vuoto', () => {
    const result = tariffInputSchema.safeParse({ ...validInput(), name: '' })
    expect(result.success).toBe(false)
  })

  it('rifiuta un nome fatto solo di spazi (trim)', () => {
    const result = tariffInputSchema.safeParse({ ...validInput(), name: '   ' })
    expect(result.success).toBe(false)
  })

  it.each(['pricePerKwh', 'blockingFeePerMinute', 'monthlyFeeEur'] as const)(
    'rifiuta %s negativo',
    (field) => {
      const result = tariffInputSchema.safeParse({ ...validInput(), [field]: -1 })
      expect(result.success).toBe(false)
    }
  )

  it('accetta zero per i campi numerici (tariffa gratuita è un caso legittimo)', () => {
    const result = tariffInputSchema.safeParse({
      ...validInput(),
      pricePerKwh: 0,
      blockingFeePerMinute: 0,
      monthlyFeeEur: 0
    })
    expect(result.success).toBe(true)
  })
})

describe('tariffSchema', () => {
  it('richiede anche un id, a differenza di tariffInputSchema', () => {
    expect(tariffSchema.safeParse(validInput()).success).toBe(false)
    expect(tariffSchema.safeParse({ ...validInput(), id: 'tariff-1' }).success).toBe(true)
  })
})
