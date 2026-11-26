import { describe, expect, it } from 'vitest'
import { acompanhamentoStart } from './acompanhamento'

describe('onde a aba Acompanhamento abre', () => {
  it('sem vínculo, abre a busca de profissionais', () => {
    expect(acompanhamentoStart(0, '/rotina')).toBe('/saude')
  })
  it('com vínculo, abre o plano na primeira vez', () => {
    expect(acompanhamentoStart(1, null)).toBe('/plano')
  })
  it('com vínculo, lembra a última seção aberta', () => {
    expect(acompanhamentoStart(2, '/rotina')).toBe('/rotina')
  })
  it('ignora um valor guardado que não é uma seção', () => {
    expect(acompanhamentoStart(1, '/equipe')).toBe('/plano')
  })
})
