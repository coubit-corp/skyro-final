import { describe, expect, it } from 'vitest'
import type { Alert } from './alerts'
import { toISODate } from './dates'
import { agoLabel, attentionSummary, groupOf, groupPatients, latest, nextAction, responsibleFor } from './patientGroups'

const alert = (kind: Alert['kind']): Alert => ({ kind, message: kind })
const atencao = (...kinds: Alert['kind'][]) => ({ status: 'atencao' as const, alerts: kinds.map(alert) })
const emDia = { status: 'em_dia' as const, alerts: [] }

describe('groupOf', () => {
  it('alerta de rotina vai para atenção', () => {
    expect(groupOf(atencao('sono'))).toBe('atencao')
    expect(groupOf(atencao('treino', 'agua'))).toBe('atencao')
  })

  it('só falta de registro fica separado', () => {
    expect(groupOf(atencao('sem_registro'))).toBe('sem_registro')
  })

  it('falta de registro junto com alerta de rotina continua sendo atenção', () => {
    expect(groupOf(atencao('sem_registro', 'treino'))).toBe('atencao')
  })

  it('sem alerta fica em dia', () => {
    expect(groupOf(emDia)).toBe('em_dia')
  })
})

describe('groupPatients', () => {
  it('divide e mantém a ordem original dentro de cada grupo', () => {
    const lista = [
      { n: 'a', evaluation: atencao('sem_registro') },
      { n: 'b', evaluation: atencao('sono') },
      { n: 'c', evaluation: emDia },
      { n: 'd', evaluation: atencao('sem_registro') },
      { n: 'e', evaluation: atencao('agua') },
    ]
    const g = groupPatients(lista)
    expect(g.atencao.map((p) => p.n)).toEqual(['b', 'e'])
    expect(g.sem_registro.map((p) => p.n)).toEqual(['a', 'd'])
    expect(g.em_dia.map((p) => p.n)).toEqual(['c'])
  })
})

describe('attentionSummary', () => {
  it('todos em dia', () => {
    expect(attentionSummary({ atencao: 0, sem_registro: 0, em_dia: 3 }).title).toBe('Todos os pacientes estão em dia')
  })

  it('só sem registro não vira "precisam de atenção"', () => {
    const s = attentionSummary({ atencao: 0, sem_registro: 6, em_dia: 0 })
    expect(s.count).toBe(0)
    expect(s.title).toBe('Nenhum paciente com alerta de rotina')
    expect(s.subtitle).toBe('6 pacientes sem registro recente')
  })

  it('conta atenção e cita os sem registro à parte', () => {
    const s = attentionSummary({ atencao: 2, sem_registro: 1, em_dia: 3 })
    expect(s.count).toBe(2)
    expect(s.title).toBe('pacientes precisam de atenção hoje')
    expect(s.subtitle).toContain('1 paciente sem registro recente')
  })

  it('singular', () => {
    expect(attentionSummary({ atencao: 1, sem_registro: 0, em_dia: 0 }).title).toBe('paciente precisa de atenção hoje')
  })
})

describe('nextAction', () => {
  it('treinos perdidos pedem revisar o plano', () => {
    expect(nextAction(atencao('treino'))).toBe('revisar_plano')
    expect(nextAction(atencao('sono', 'treino'))).toBe('revisar_plano')
  })

  it('sono, água ou falta de registro pedem conversa', () => {
    expect(nextAction(atencao('sono'))).toBe('conversar')
    expect(nextAction(atencao('agua'))).toBe('conversar')
    expect(nextAction(atencao('sem_registro'))).toBe('conversar')
  })

  it('sem alerta, só acompanhar', () => {
    expect(nextAction(emDia)).toBe('acompanhar')
  })
})

describe('responsibleFor', () => {
  const team = [
    { professionalId: 'n', specialty: 'nutricionista' as const, firstName: 'Nina' },
    { professionalId: 'p', specialty: 'personal' as const, firstName: 'Paula' },
  ]
  it('sem alerta, ninguém', () => {
    expect(responsibleFor([], 'personal', team)).toBeNull()
  })
  it('água é com a nutricionista da equipe', () => {
    expect(responsibleFor([{ kind: 'agua' }], 'personal', team)).toEqual({ label: 'Nina (nutricionista)', isMe: false })
  })
  it('é você quando a área do alerta é a sua', () => {
    expect(responsibleFor([{ kind: 'treino' }], 'personal', team)).toEqual({ label: 'Você', isMe: true })
  })
  it('é você quando ninguém da área está na equipe ou o alerta é só falta de registro', () => {
    expect(responsibleFor([{ kind: 'sono' }], 'personal', team)).toEqual({ label: 'Você', isMe: true })
    expect(responsibleFor([{ kind: 'sem_registro' }], 'nutricionista', team)).toEqual({ label: 'Você', isMe: true })
  })
  it('pula o alerta cuja área não tem ninguém na equipe', () => {
    expect(responsibleFor([{ kind: 'sono' }, { kind: 'agua' }], 'personal', team)?.label).toBe('Nina (nutricionista)')
  })
  it('usa o primeiro alerta que tem área', () => {
    expect(responsibleFor([{ kind: 'sem_registro' }, { kind: 'treino' }], 'nutricionista', team)?.label).toBe('Paula (personal)')
  })
})

describe('agoLabel e latest', () => {
  it('conta os dias no fuso do aparelho', () => {
    const today = toISODate(new Date())
    expect(agoLabel(new Date().toISOString(), today)).toBe('hoje')
    expect(agoLabel(new Date(Date.now() - 86_400_000).toISOString(), today)).toBe('ontem')
    expect(agoLabel(new Date(Date.now() - 5 * 86_400_000).toISOString(), today)).toBe('há 5 dias')
  })
  it('latest ignora vazios', () => {
    expect(latest(null, '2026-11-20T10:00:00+00:00', undefined, '2026-11-25T10:00:00+00:00')).toBe('2026-11-25T10:00:00+00:00')
    expect(latest(null, undefined)).toBeNull()
  })
})
