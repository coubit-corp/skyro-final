import { describe, expect, it } from 'vitest'
import {
  durationLabel,
  estimate1RM,
  EXERCISE_CATALOG,
  exerciseStats,
  finishWorkout,
  normalizeName,
  parseNumber,
  previousSets,
  recentExercises,
  restLabel,
  routineExerciseSummary,
  searchExercises,
  setLabel,
  startWorkout,
  toggleSet,
  validateRoutine,
  workoutTotals,
  type Routine,
} from './workouts'

const routine: Routine = {
  id: 'r1',
  name: 'Dia 1',
  exercises: [
    { name: 'Supino inclinado (máquina)', muscle: 'peito', sets: 2, reps: '5-8', rest_sec: 135 },
    { name: 'Crucifixo (máquina)', muscle: 'peito', sets: 1, reps: '10', rest_sec: 120 },
  ],
}

// do mais novo para o mais antigo, como vem do banco
const history = [
  { id: 'h3', occurred_on: '2026-11-20', title: 'Dia 2', details: { exercises: [{ name: 'Puxada alta (cabo)', sets: [{ reps: 10, weight_kg: 50 }] }] } },
  { id: 'h2', occurred_on: '2026-11-18', title: 'Dia 1', details: { exercises: [{ name: 'SUPINO  inclinado (maquina)', sets: [{ reps: 15, weight_kg: 15 }, { reps: 8, weight_kg: 40 }] }] } },
  { id: 'h1', occurred_on: '2026-11-10', title: 'Dia 1', details: { exercises: [{ name: 'Supino inclinado (máquina)', sets: [{ reps: 10, weight_kg: 35 }, { reps: null, weight_kg: null }] }] } },
]

describe('catálogo de exercícios', () => {
  it('não tem nome repetido', () => {
    const names = EXERCISE_CATALOG.map((e) => normalizeName(e.name))
    expect(new Set(names).size).toBe(names.length)
  })
  it('busca sem acento, em qualquer ordem, e filtra por músculo', () => {
    expect(searchExercises(EXERCISE_CATALOG, 'maquina supino', 'todos').map((e) => e.name)).toEqual([
      'Supino reto (máquina)',
      'Supino inclinado (máquina)',
    ])
    expect(searchExercises(EXERCISE_CATALOG, '', 'panturrilhas')).toHaveLength(3)
    expect(searchExercises(EXERCISE_CATALOG, 'supino', 'costas')).toHaveLength(0)
  })
})

describe('treino montado', () => {
  it('exige nome e exercício', () => {
    expect(validateRoutine(' ', routine.exercises)).toMatch(/nome/)
    expect(validateRoutine('Dia 1', [])).toMatch(/exercício/)
    expect(validateRoutine('Dia 1', routine.exercises)).toBeNull()
  })
  it('resume séries, descanso e duração', () => {
    expect(routineExerciseSummary(routine.exercises[0])).toBe('2 séries · 5-8 reps')
    expect(restLabel(135)).toBe('2min 15s')
    expect(restLabel(120)).toBe('2min')
    expect(restLabel(0)).toBe('Sem descanso')
    expect(durationLabel(44)).toBe('44s')
    expect(durationLabel(754)).toBe('12min 34s')
    expect(durationLabel(3725)).toBe('1h 02min')
  })
})

describe('treino em andamento', () => {
  it('começa com as séries do treino montado, em branco', () => {
    const w = startWorkout(routine, 1000)
    expect(w.title).toBe('Dia 1')
    expect(w.exercises.map((e) => [e.name, e.sets.length, e.restSec, e.target])).toEqual([
      ['Supino inclinado (máquina)', 2, 135, '5-8'],
      ['Crucifixo (máquina)', 1, 120, '10'],
    ])
    expect(startWorkout(null, 1000)).toMatchObject({ title: 'Treino livre', exercises: [] })
  })
  it('lê números com vírgula e recusa lixo', () => {
    expect(parseNumber('12,5')).toBe(12.5)
    expect(parseNumber(' 40 ')).toBe(40)
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('-3')).toBeNull()
    expect(parseNumber('1e3')).toBeNull()
  })
  it('marcar série vazia usa o treino anterior; sem repetições, não marca', () => {
    const blank = { kg: '', reps: '', done: false }
    expect(toggleSet(blank, { reps: 8, weight_kg: 40 })).toEqual({ kg: '40', reps: '8', done: true })
    expect(toggleSet(blank, undefined)).toEqual(blank)
    expect(toggleSet({ kg: '', reps: '12', done: false }, undefined)).toEqual({ kg: '', reps: '12', done: true })
    expect(toggleSet({ kg: 'abc', reps: '12', done: false }, undefined).done).toBe(false)
    expect(toggleSet({ kg: '20', reps: '8', done: true }, undefined)).toEqual({ kg: '20', reps: '8', done: false })
  })
  it('soma volume e séries só do que foi marcado', () => {
    const w = startWorkout(routine, 0)
    w.exercises[0].sets = [
      { kg: '15', reps: '10', done: true },
      { kg: '20', reps: '8', done: false },
    ]
    expect(workoutTotals(w)).toEqual({ volumeKg: 150, sets: 1 })
  })
  it('conclui só com as séries marcadas', () => {
    const w = startWorkout(routine, 0)
    expect(finishWorkout(w, 60_000)).toMatch(/pelo menos uma série/)
    w.exercises[0].sets[0] = { kg: '15', reps: '10', done: true }
    w.exercises[0].note = '  banco no 3  '
    expect(finishWorkout(w, 44 * 60_000 + 20_000)).toEqual({
      title: 'Dia 1',
      details: {
        duration_min: 44,
        exercises: [
          { name: 'Supino inclinado (máquina)', muscle: 'peito', note: 'banco no 3', sets: [{ reps: 10, weight_kg: 15 }] },
        ],
      },
    })
  })
  it('peso do corpo fica sem carga', () => {
    const w = startWorkout(null, 0)
    w.exercises.push({ name: 'Barra fixa', muscle: 'costas', restSec: 90, target: '', note: '', sets: [{ kg: '', reps: '6', done: true }] })
    const done = finishWorkout(w, 1000)
    expect(typeof done).toBe('object')
    expect((done as Exclude<typeof done, string>).details).toMatchObject({
      duration_min: 1,
      exercises: [{ sets: [{ reps: 6, weight_kg: null }] }],
    })
  })
})

describe('histórico do exercício', () => {
  it('coluna "Anterior": o último treino com o exercício, ignorando acento e maiúscula', () => {
    expect(previousSets(history, 'Supino inclinado (máquina)')).toEqual([
      { reps: 15, weight_kg: 15 },
      { reps: 8, weight_kg: 40 },
    ])
    expect(previousSets(history, 'Leg press 45°')).toEqual([])
  })
  it('gráfico e recordes', () => {
    const s = exerciseStats(history, 'Supino inclinado (máquina)')
    expect(s.points.map((p) => [p.date, p.maxKg])).toEqual([
      ['2026-11-10', 35],
      ['2026-11-18', 40],
    ])
    expect(s.maxWeight).toEqual({ kg: 40, date: '2026-11-18' })
    expect(s.best1rm?.kg).toBeCloseTo(50.67, 1)
    expect(s.bestSet).toEqual({ kg: 35, reps: 10, date: '2026-11-10' })
    expect(s.sessions.map((x) => x.id)).toEqual(['h2', 'h1'])
  })
  it('1RM estimado', () => {
    expect(estimate1RM(100, 1)).toBe(100)
    expect(estimate1RM(35, 10)).toBeCloseTo(46.67, 2)
  })
  it('exercícios recentes sem repetir, com o nome do catálogo', () => {
    expect(recentExercises(history)).toEqual([
      { name: 'Puxada alta (cabo)', muscle: 'costas' },
      { name: 'Supino inclinado (máquina)', muscle: 'peito' },
    ])
  })
  it('descreve a série', () => {
    expect(setLabel({ reps: 8, weight_kg: 40 })).toBe('40 kg x 8')
    expect(setLabel({ reps: 12, weight_kg: null })).toBe('x 12')
    expect(setLabel({ reps: null, weight_kg: null })).toBe('—')
  })
})
