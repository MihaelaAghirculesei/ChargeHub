import { describe, expect, it } from 'vitest'
import { tariffInputSchema, tariffSchema } from '~/modules/tariffs/domain/tariff'

function validInput() {
  return { name: 'Standard', pricePerKwh: 0.45, blockingFeePerMinute: 0.1, monthlyFeeEur: 9.99 }
}

describe('tariffInputSchema', () => {
  it('accepts a valid input', () => {
    expect(tariffInputSchema.safeParse(validInput()).success).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = tariffInputSchema.safeParse({ ...validInput(), name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a name made only of spaces (trim)', () => {
    const result = tariffInputSchema.safeParse({ ...validInput(), name: '   ' })
    expect(result.success).toBe(false)
  })

  it.each(['pricePerKwh', 'blockingFeePerMinute', 'monthlyFeeEur'] as const)(
    'rejects a negative %s',
    (field) => {
      const result = tariffInputSchema.safeParse({ ...validInput(), [field]: -1 })
      expect(result.success).toBe(false)
    }
  )

  it('accepts zero for the numeric fields (a free tariff is a legitimate case)', () => {
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
  it('also requires an id, unlike tariffInputSchema', () => {
    expect(tariffSchema.safeParse(validInput()).success).toBe(false)
    expect(tariffSchema.safeParse({ ...validInput(), id: 'tariff-1' }).success).toBe(true)
  })
})
