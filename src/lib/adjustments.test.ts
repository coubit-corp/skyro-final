import { describe, expect, it } from 'vitest'
import { isOngoing, kindLabel, statusForPerson, visibleForPerson, waitingForPro, waitingSince } from './adjustments'

const r = (status: Parameters<typeof isOngoing>[0]['status'], created_at: string) => ({ status, created_at })

describe('waitingForPro', () => {
  it('só os pedidos sem resposta, o mais antigo primeiro', () => {
    const list = [r('aberto', '2026-11-26T10:00:00Z'), r('proposto', '2026-11-20T10:00:00Z'), r('aberto', '2026-11-25T10:00:00Z')]
    expect(waitingForPro(list).map((x) => x.created_at)).toEqual(['2026-11-25T10:00:00Z', '2026-11-26T10:00:00Z'])
  })
})

describe('visibleForPerson', () => {
  it('mostra os em andamento e só o último decidido', () => {
    const list = [
      r('aceito', '2026-11-01T10:00:00Z'),
      r('recusado', '2026-11-10T10:00:00Z'),
      r('cancelado', '2026-11-12T10:00:00Z'),
      r('proposto', '2026-11-20T10:00:00Z'),
      r('aberto', '2026-11-25T10:00:00Z'),
    ]
    expect(visibleForPerson(list).map((x) => x.status)).toEqual(['aberto', 'proposto', 'recusado'])
  })
  it('lista vazia', () => expect(visibleForPerson([])).toEqual([]))
})

describe('textos', () => {
  it('estado para o cliente', () => {
    expect(statusForPerson({ status: 'aberto' }, 'Pedro')).toBe('Aguardando Pedro')
    expect(statusForPerson({ status: 'proposto' }, 'Pedro')).toBe('Pedro respondeu')
    expect(statusForPerson({ status: 'aceito' }, 'Pedro')).toBe('Ajuste combinado')
  })
  it('tipo do pedido', () => expect(kindLabel('trocar_dia')).toBe('Trocar o dia'))
  it('tempo de espera', () => {
    const now = new Date('2026-11-26T12:00:00Z')
    expect(waitingSince('2026-11-26T11:30:00Z', now)).toBe('há menos de 1 h')
    expect(waitingSince('2026-11-26T07:00:00Z', now)).toBe('há 5 h')
    expect(waitingSince('2026-11-25T11:00:00Z', now)).toBe('há 1 dia')
    expect(waitingSince('2026-11-23T11:00:00Z', now)).toBe('há 3 dias')
    expect(waitingSince('2026-11-27T11:00:00Z', now)).toBe('há menos de 1 h')
  })
})
