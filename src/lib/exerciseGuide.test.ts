import { describe, expect, it } from 'vitest'
import { EXERCISE_GUIDES, guessEquipment, youtubeSearchUrl } from './exerciseGuide'
import {
  cleanVideoLink,
  EXERCISE_CATALOG,
  exerciseInfo,
  finishWorkout,
  muscleSets,
  searchExercises,
  similarExercises,
  startWorkout,
} from './workouts'

describe('guia dos exercícios', () => {
  it('todo exercício da lista tem vídeo, equipamento e passo a passo', () => {
    for (const e of EXERCISE_CATALOG) {
      const g = EXERCISE_GUIDES[e.name]
      expect(g, e.name).toBeDefined()
      expect(g.youtubeId, e.name).toMatch(/^[A-Za-z0-9_-]{11}$/)
      expect(g.steps.length, e.name).toBeGreaterThanOrEqual(3)
      expect(g.secondary, e.name).not.toContain(e.muscle)
    }
  })

  it('não há guia sobrando nem vídeo repetido', () => {
    const names = new Set(EXERCISE_CATALOG.map((e) => e.name))
    for (const k of Object.keys(EXERCISE_GUIDES)) expect(names.has(k), k).toBe(true)
    const ids = Object.values(EXERCISE_GUIDES).map((g) => g.youtubeId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('adivinha o equipamento de um exercício criado pela pessoa', () => {
    expect(guessEquipment('Rosca 21 (halteres)')).toBe('halteres')
    expect(guessEquipment('Face pull na polia')).toBe('cabo')
    expect(guessEquipment('Barra fixa supinada')).toBeUndefined()
    expect(guessEquipment('Burpee')).toBeUndefined()
  })

  it('busca no YouTube pelo nome do exercício', () => {
    expect(youtubeSearchUrl('Face pull')).toBe('https://www.youtube.com/results?search_query=como%20fazer%20Face%20pull%20execu%C3%A7%C3%A3o')
  })
})

describe('filtro por equipamento', () => {
  it('combina com músculo e busca', () => {
    const r = searchExercises(EXERCISE_CATALOG, 'supino', 'peito', 'maquina').map((e) => e.name)
    expect(r).toEqual(['Supino reto (máquina)', 'Supino inclinado (máquina)'])
    expect(searchExercises(EXERCISE_CATALOG, '', 'todos', 'peso_corporal').map((e) => e.name)).toContain('Barra fixa')
  })
})

describe('exerciseInfo', () => {
  it('exercício da lista: vídeo do YouTube, músculos e passos (sem ligar para acento ou maiúscula)', () => {
    const info = exerciseInfo('crucifixo (MAQUINA)')
    expect(info.name).toBe('Crucifixo (máquina)')
    expect(info.fromCatalog).toBe(true)
    expect(info.video).toEqual({ provider: 'youtube', id: 'zEcIgGm7fxU' })
    expect(info.steps.length).toBeGreaterThan(0)
    expect(info.equipment).toBe('maquina')
  })

  it('exercício criado: usa o vídeo que a pessoa anexou', () => {
    const info = exerciseInfo('Face pull', [
      { name: 'Face pull', muscle: 'ombros' },
      { name: 'face pull', muscle: 'ombros', video: 'https://www.youtube.com/watch?v=abcdefghijk' },
    ])
    expect(info.fromCatalog).toBe(false)
    expect(info.muscle).toBe('ombros')
    expect(info.video).toEqual({ provider: 'youtube', id: 'abcdefghijk' })
    expect(info.steps).toEqual([])
  })

  it('exercício criado sem vídeo', () => {
    expect(exerciseInfo('Burpee').video).toBeNull()
    expect(exerciseInfo('Burpee').muscle).toBe('outro')
  })

  it('exercícios parecidos: mesmo músculo, sem o próprio', () => {
    const s = similarExercises('Crucifixo (máquina)', 'peito')
    expect(s.length).toBeGreaterThan(0)
    expect(s.every((e) => e.muscle === 'peito')).toBe(true)
    expect(s.map((e) => e.name)).not.toContain('Crucifixo (máquina)')
  })
})

describe('cleanVideoLink', () => {
  it('aceita YouTube, Vimeo e Drive e devolve o link padrão', () => {
    expect(cleanVideoLink('youtu.be/abcdefghijk')).toBe('https://www.youtube.com/watch?v=abcdefghijk')
    expect(cleanVideoLink('https://www.youtube.com/shorts/abcdefghijk?si=x')).toBe('https://www.youtube.com/watch?v=abcdefghijk')
    expect(cleanVideoLink('https://vimeo.com/12345678')).toBe('https://vimeo.com/12345678')
  })
  it('recusa outros links', () => {
    expect(cleanVideoLink('https://exemplo.com/video.mp4')).toBeNull()
    expect(cleanVideoLink('')).toBeNull()
  })
})

describe('vídeo de exercício criado vai junto com o treino', () => {
  it('do treino montado ao treino concluído', () => {
    const w = startWorkout(
      { id: 'r', name: 'Dia 1', exercises: [{ name: 'Face pull', muscle: 'ombros', sets: 1, reps: '12', rest_sec: 60, video: 'https://www.youtube.com/watch?v=abcdefghijk' }] },
      0,
    )
    expect(w.exercises[0].video).toBe('https://www.youtube.com/watch?v=abcdefghijk')
    w.exercises[0].sets[0] = { kg: '10', reps: '12', done: true }
    const done = finishWorkout(w, 60_000)
    expect(typeof done).not.toBe('string')
    if (typeof done !== 'string') expect(done.details.exercises[0].video).toBe('https://www.youtube.com/watch?v=abcdefghijk')
  })
})

describe('muscleSets', () => {
  const entry = (id: string, occurred_on: string, exercises: { name: string; muscle?: string; sets: { reps: number }[] }[]) => ({
    id,
    occurred_on,
    title: 'Treino',
    details: { exercises: exercises as never },
  })

  it('conta séries do músculo principal e meia série dos secundários, só nos últimos 7 dias', () => {
    const history = [
      entry('1', '2026-11-27', [{ name: 'Supino reto (barra)', muscle: 'peito', sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }, { reps: 8 }] }]),
      entry('2', '2026-11-21', [{ name: 'Rosca direta (barra)', sets: [{ reps: 10 }, { reps: 10 }] }]),
      entry('3', '2026-11-20', [{ name: 'Mesa flexora', muscle: 'posteriores', sets: [{ reps: 10 }] }]),
      entry('4', '2026-11-25', [{ name: 'Esteira', muscle: 'cardio', sets: [{ reps: 1 }] }]),
    ]
    const r = muscleSets(history, '2026-11-27')
    expect(r.peito).toBe(4)
    expect(r.triceps).toBe(2)
    expect(r.ombros).toBe(2)
    expect(r.biceps).toBe(2) // sem músculo salvo: vem da lista
    expect(r.posteriores).toBeUndefined() // fora da janela
    expect(r.quadriceps).toBe(0.5) // secundário da esteira; cardio não entra
    expect(r).not.toHaveProperty('cardio')
  })
})
