import { describe, expect, it } from 'vitest'
import {
  formatPrice,
  initialOffer,
  meetingsLabel,
  parseCompareIds,
  parsePrice,
  responseLabel,
  toggleCompare,
  toOfferRow,
  validateOffer,
  type ProfessionalOffer,
} from './offers'

describe('preço', () => {
  it('formata', () => {
    expect(formatPrice(24000)).toBe('R$ 240')
    expect(formatPrice(24990)).toBe('R$ 249,90')
    expect(formatPrice(120000)).toBe('R$ 1.200')
    expect(formatPrice(0)).toBe('Gratuito')
  })
  it('lê o que a pessoa digita', () => {
    expect(parsePrice('250')).toBe(25000)
    expect(parsePrice('249,90')).toBe(24990)
    expect(parsePrice('R$ 1.200')).toBe(120000)
    expect(parsePrice('1200,5')).toBe(120050)
    expect(parsePrice('0')).toBe(0)
  })
  it('recusa valor inválido', () => {
    for (const bad of ['', 'abc', '-10', '12.5', '1,234', '999999999']) expect(parsePrice(bad)).toBeNull()
  })
})

describe('textos', () => {
  it('prazo de resposta', () => {
    expect(responseLabel(12)).toBe('12 horas')
    expect(responseLabel(24)).toBe('1 dia')
    expect(responseLabel(72)).toBe('3 dias')
  })
  it('encontros', () => {
    expect(meetingsLabel(0)).toBe('Sem encontros, só pelo app')
    expect(meetingsLabel(1)).toBe('1 encontro por mês')
    expect(meetingsLabel(4)).toBe('4 encontros por mês')
  })
})

describe('formulário', () => {
  const offer: ProfessionalOffer = {
    professional_id: 'p',
    monthly_price_cents: 24990,
    meetings_per_month: 4,
    contact_initiator: 'profissional',
    review_frequency: 'semanal',
    response_hours: 48,
    adjustment_policy: 'Pelo app',
    updated_at: '2026-11-26T00:00:00Z',
  }
  it('abre com a oferta salva e grava igual', () => {
    const values = initialOffer(offer)
    expect(values.price).toBe('249,90')
    expect(validateOffer(values)).toEqual({})
    expect(toOfferRow('p', values)).toMatchObject({ ...offer, updated_at: expect.any(String) })
  })
  it('oferta gratuita volta como 0', () => {
    expect(initialOffer({ ...offer, monthly_price_cents: 0 }).price).toBe('0')
  })
  it('aponta os campos errados', () => {
    const errors = validateOffer({ ...initialOffer(), price: 'x', meetings: '40' })
    expect(Object.keys(errors)).toEqual(['price', 'meetings'])
  })
})

describe('comparação', () => {
  it('ids da URL: só os válidos, sem repetir, até 3', () => {
    expect(parseCompareIds('a,x,b,a,c,d', ['a', 'b', 'c', 'd'])).toEqual(['a', 'b', 'c'])
    expect(parseCompareIds(null, ['a'])).toEqual([])
  })
  it('liga, desliga e para em 3', () => {
    expect(toggleCompare(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleCompare(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleCompare(['a', 'b', 'c'], 'd')).toEqual(['a', 'b', 'c'])
  })
})
