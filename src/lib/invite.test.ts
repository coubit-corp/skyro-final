import { describe, expect, it } from 'vitest'
import { challengePath } from './invite'

describe('challengePath', () => {
  it('leva cada tipo de conta para a sua Comunidade', () => {
    expect(challengePath('person', 'abc')).toBe('/comunidade?desafio=abc')
    expect(challengePath('professional', 'abc')).toBe('/pro/comunidade?desafio=abc')
  })
  it('a Equipe não participa de desafios', () => {
    expect(challengePath('admin', 'abc')).toBeNull()
  })
})
