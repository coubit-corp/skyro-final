import { describe, expect, it } from 'vitest'
import { friendlyError } from './authErrors'

describe('friendlyError', () => {
  it('traduz os erros mais comuns', () => {
    expect(friendlyError('Invalid login credentials')).toMatch(/E-mail ou senha incorretos/)
    expect(friendlyError('User already registered')).toMatch(/já tem cadastro/)
    expect(friendlyError('Email rate limit exceeded')).toMatch(/Muitas tentativas/)
    expect(friendlyError('TypeError: Failed to fetch')).toMatch(/Sem conexão/)
  })
  it('mantém mensagens desconhecidas', () => {
    expect(friendlyError('outra coisa')).toBe('outra coisa')
  })
})
