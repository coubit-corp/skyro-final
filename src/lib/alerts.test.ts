import { describe, expect, it } from 'vitest'
import { alertSince, evaluatePatient, longestAlertDays } from './alerts'
import type { DailyLog } from './database.types'
import { addDays } from './dates'

const TODAY = '2026-11-14'

/** Registro "bom" por padrão; cada teste muda só o que interessa. */
function log(daysAgo: number, over: Partial<DailyLog> = {}): DailyLog {
  return {
    id: `l${daysAgo}`,
    user_id: 'u',
    log_date: addDays(TODAY, -daysAgo),
    sleep_hours: 7.5,
    water_liters: 2,
    water_goal_liters: 2,
    focus_minutes: 60,
    workout_planned: true,
    workout_done: true,
    mood: null,
    pain_level: null,
    created_at: '',
    updated_at: '',
    ...over,
  }
}

const week = (over: (i: number) => Partial<DailyLog> = () => ({})) =>
  Array.from({ length: 8 }, (_, i) => log(i, over(i)))

describe('evaluatePatient', () => {
  it('fica "em dia" quando tudo está bem', () => {
    const r = evaluatePatient(week(), TODAY)
    expect(r.status).toBe('em_dia')
    expect(r.alerts).toEqual([])
    expect(r.workoutsDone).toBe(7)
    expect(r.workoutsPlanned).toBe(7)
  })

  describe('sono', () => {
    it('alerta com menos de 6h na última noite', () => {
      const r = evaluatePatient(week((i) => (i === 0 ? { sleep_hours: 5.5 } : {})), TODAY)
      expect(r.status).toBe('atencao')
      expect(r.alerts).toEqual([{ kind: 'sono', message: 'Dormiu 5h30', days: 1, dates: [TODAY] }])
    })

    it('não alerta com exatamente 6h', () => {
      const r = evaluatePatient(week((i) => (i === 0 ? { sleep_hours: 6 } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })

    it('usa o registro de ontem se hoje ainda não tem', () => {
      const logs = week((i) => (i === 1 ? { sleep_hours: 4 } : {})).filter((l) => l.log_date !== TODAY)
      const r = evaluatePatient(logs, TODAY)
      expect(r.alerts.map((a) => a.kind)).toContain('sono')
      expect(r.lastSleep).toBe(4)
    })

    it('ignora noites ruins mais antigas que ontem', () => {
      const r = evaluatePatient(week((i) => (i === 3 ? { sleep_hours: 3 } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })
  })

  describe('treinos', () => {
    it('alerta com 2 treinos planejados perdidos na semana', () => {
      const r = evaluatePatient(week((i) => (i === 1 || i === 3 ? { workout_done: false } : {})), TODAY)
      expect(r.alerts).toEqual([
        { kind: 'treino', message: 'Faltou a 2 treinos na semana', days: 3, dates: [addDays(TODAY, -1), addDays(TODAY, -3)] },
      ])
      expect(r.workoutsDone).toBe(5)
    })

    it('não alerta com só 1 falta', () => {
      const r = evaluatePatient(week((i) => (i === 2 ? { workout_done: false } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })

    it('não conta o treino de hoje como falta (o dia não acabou)', () => {
      const r = evaluatePatient(week((i) => (i === 0 || i === 2 ? { workout_done: false } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })

    it('dia sem treino planejado não é falta', () => {
      const r = evaluatePatient(
        week((i) => (i === 1 || i === 2 ? { workout_planned: false, workout_done: false } : {})),
        TODAY,
      )
      expect(r.status).toBe('em_dia')
      expect(r.workoutsPlanned).toBe(5)
    })

    it('dia sem registro não é falta, mesmo sem nenhum treino feito', () => {
      // Só hoje e o dia 1 registrados; os outros 6 dias estão vazios.
      const r = evaluatePatient([log(0), log(1, { workout_done: false })], TODAY)
      expect(r.alerts.map((a) => a.kind)).not.toContain('treino')
      expect(r.workoutsPlanned).toBe(1)
    })

    it('teste repetível: perfil limpo + 2 registros de falta fazem o alerta aparecer', () => {
      // Estado inicial: registrou ontem e anteontem, com treino feito. Nenhum alerta.
      const antes = [log(0), log(1), log(2)]
      expect(evaluatePatient(antes, TODAY).status).toBe('em_dia')
      // Ação: em Rotina, marcar "Tinha treino planejado?" sem "Treinei" em dois dias.
      const depois = [log(0), log(1, { workout_done: false }), log(2, { workout_done: false })]
      const alerta = evaluatePatient(depois, TODAY).alerts.find((a) => a.kind === 'treino')
      expect(alerta?.dates).toEqual([addDays(TODAY, -1), addDays(TODAY, -2)])
    })

    it('não olha além de 7 dias', () => {
      const r = evaluatePatient(week((i) => (i === 7 ? { workout_done: false } : {})).concat(log(9, { workout_done: false })), TODAY)
      expect(r.alerts.map((a) => a.kind)).not.toContain('treino')
    })
  })

  describe('água', () => {
    it('alerta com menos de 50% da meta ontem', () => {
      const r = evaluatePatient(week((i) => (i === 1 ? { water_liters: 0.8 } : {})), TODAY)
      expect(r.alerts).toEqual([{ kind: 'agua', message: 'Água: 0,8 L de 2 L', days: 1, dates: [addDays(TODAY, -1)] }])
    })

    it('não alerta com exatamente 50%', () => {
      const r = evaluatePatient(week((i) => (i === 1 ? { water_liters: 1 } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })

    it('respeita a meta de cada pessoa', () => {
      const r = evaluatePatient(week((i) => (i === 1 ? { water_liters: 1.4, water_goal_liters: 3 } : {})), TODAY)
      expect(r.alerts.map((a) => a.kind)).toEqual(['agua'])
    })

    it('olha só ontem (hoje ainda está acontecendo)', () => {
      const r = evaluatePatient(week((i) => (i === 0 ? { water_liters: 0.2 } : {})), TODAY)
      expect(r.status).toBe('em_dia')
    })
  })

  describe('sem registro', () => {
    it('não alerta se registrou ontem mas não hoje', () => {
      const r = evaluatePatient(week().filter((l) => l.log_date !== TODAY), TODAY)
      expect(r.status).toBe('em_dia')
      expect(r.daysSinceLastLog).toBe(1)
    })

    it('alerta sem registro há 2 dias', () => {
      const r = evaluatePatient([log(2), log(3), log(4)], TODAY)
      expect(r.alerts.map((a) => a.kind)).toContain('sem_registro')
      expect(r.alerts.find((a) => a.kind === 'sem_registro')?.message).toBe('Sem registro há 2 dias')
    })

    it('alerta quem nunca registrou', () => {
      const r = evaluatePatient([], TODAY)
      expect(r.status).toBe('atencao')
      expect(r.alerts).toEqual([{ kind: 'sem_registro', message: 'Nenhum registro ainda' }])
      expect(r.lastSleep).toBeNull()
    })
  })

  it('junta vários alertas (cenário do Lucas na demo)', () => {
    // hoje 5h30; faltou ontem e há 3 dias; água ok
    const r = evaluatePatient(
      week((i) => ({
        ...(i === 0 ? { sleep_hours: 5.5, workout_done: false } : {}),
        ...(i === 1 || i === 3 ? { workout_done: false } : {}),
        ...(i === 1 ? { water_liters: 1.6 } : {}),
      })),
      TODAY,
    )
    expect(r.status).toBe('atencao')
    expect(r.alerts.map((a) => a.kind)).toEqual(['sono', 'treino'])
  })

  describe('há quanto tempo', () => {
    it('conta noites seguidas de sono curto', () => {
      const r = evaluatePatient(week((i) => (i <= 2 ? { sleep_hours: 5 } : {})), TODAY)
      expect(r.alerts.find((a) => a.kind === 'sono')?.days).toBe(3)
    })
    it('conta dias seguidos com pouca água, a partir de ontem', () => {
      const r = evaluatePatient(week((i) => (i >= 1 && i <= 4 ? { water_liters: 0.5 } : {})), TODAY)
      expect(r.alerts.find((a) => a.kind === 'agua')?.days).toBe(4)
    })
    it('sem registro: os dias desde o último registro; nunca registrou: sem duração', () => {
      expect(evaluatePatient([log(5)], TODAY).alerts[0]).toMatchObject({ kind: 'sem_registro', days: 5 })
      expect(evaluatePatient([], TODAY).alerts[0].days).toBeUndefined()
    })
  })
})

describe('alertSince', () => {
  it('descreve a duração de cada tipo de alerta', () => {
    expect(alertSince({ kind: 'sono', message: '', days: 1 })).toBe('última noite')
    expect(alertSince({ kind: 'sono', message: '', days: 3 })).toBe('3 noites seguidas')
    expect(alertSince({ kind: 'agua', message: '', days: 1 })).toBe('desde ontem')
    expect(alertSince({ kind: 'treino', message: '', days: 6 })).toBe('há 6 dias')
    expect(alertSince({ kind: 'sem_registro', message: 'Sem registro há 4 dias', days: 4 })).toBeNull()
  })
  it('longestAlertDays pega o alerta mais antigo', () => {
    expect(longestAlertDays([{ kind: 'sono', message: '', days: 2 }, { kind: 'agua', message: '', days: 5 }])).toBe(5)
    expect(longestAlertDays([])).toBe(0)
  })
})
