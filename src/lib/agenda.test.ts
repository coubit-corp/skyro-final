import { describe, expect, it } from 'vitest'
import { weekdayNumber } from './agenda'

describe('dia da semana da agenda', () => {
  it('segunda é 1 e domingo é 7', () => {
    expect(weekdayNumber('2026-11-23')).toBe(1)
    expect(weekdayNumber('2026-11-26')).toBe(4)
    expect(weekdayNumber('2026-11-29')).toBe(7)
  })
})
