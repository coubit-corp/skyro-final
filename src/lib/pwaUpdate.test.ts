import { describe, expect, it } from 'vitest'
import { hasUnsavedText } from './pwaUpdate'

describe('hasUnsavedText', () => {
  it('texto em textarea ou input de texto conta como rascunho', () => {
    expect(hasUnsavedText([{ tagName: 'TEXTAREA', value: 'Bom dia' }])).toBe(true)
    expect(hasUnsavedText([{ tagName: 'INPUT', type: 'text', value: 'oi' }])).toBe(true)
    expect(hasUnsavedText([{ tagName: 'input', type: 'email', value: 'a@b.com' }])).toBe(true)
  })

  it('campos vazios, números e caixas de seleção não seguram a atualização', () => {
    expect(hasUnsavedText([])).toBe(false)
    expect(hasUnsavedText([{ tagName: 'TEXTAREA', value: '   ' }])).toBe(false)
    expect(hasUnsavedText([{ tagName: 'INPUT', type: 'number', value: '2' }])).toBe(false)
    expect(hasUnsavedText([{ tagName: 'INPUT', type: 'checkbox', value: 'on' }])).toBe(false)
  })
})
