import { describe, expect, it } from 'vitest'
import { adaptedMinutes, adaptWorkout, estimateSeconds, isAdaptation, SHORT_MINUTES, type AdaptableExercise } from './adaptation'
import { findCatalogExercise } from './workouts'

// Plano do personal da demo: títulos escritos à mão, sem o equipamento entre parênteses.
const plano: AdaptableExercise[] = [
  { name: 'Agachamento livre', sets: 4, reps: '10', load: '40 kg' },
  { name: 'Supino reto', sets: 4, reps: '10', load: '30 kg' },
  { name: 'Prancha', sets: 3, reps: '40 s' },
]

describe('findCatalogExercise', () => {
  it('acha a variação da lista para um título escrito à mão', () => {
    expect(findCatalogExercise('Agachamento livre')?.name).toBe('Agachamento livre (barra)')
    expect(findCatalogExercise('supino RETO')?.muscle).toBe('peito')
    expect(findCatalogExercise('Prancha')?.name).toBe('Prancha')
    expect(findCatalogExercise('Burpee')).toBeUndefined()
  })
})

describe('adaptWorkout', () => {
  it('sem adaptação, devolve igual', () => {
    expect(adaptWorkout(plano, null)).toEqual(plano)
  })

  it('"Hoje está difícil": metade das séries (arredonda para cima) e carga mais leve', () => {
    const r = adaptWorkout(plano, 'leve')
    expect(r.map((e) => e.sets)).toEqual([2, 2, 2])
    expect(r[0].tip).toBe('carga mais leve que a combinada')
    expect(r[2].tip).toBe('ritmo tranquilo')
    expect(adaptWorkout([{ name: 'x', sets: 1, reps: '10' }], 'leve')[0].sets).toBe(1)
  })

  it('"Sem equipamento": troca pelo peso do corpo e mantém o que já é sem aparelho', () => {
    const r = adaptWorkout(plano, 'sem_equipamento')
    expect(r[0]).toMatchObject({ name: 'Agachamento (peso do corpo)', replaces: 'Agachamento livre', sets: 4, load: null })
    expect(r[1]).toMatchObject({ name: 'Flexão de braço', replaces: 'Supino reto' })
    expect(r[2]).toEqual(plano[2])
  })

  it('"Sem equipamento": não repete o mesmo substituto e pula o que não tem substituto', () => {
    const r = adaptWorkout(
      [
        { name: 'Supino reto (barra)', sets: 3, reps: '10' },
        { name: 'Crucifixo (máquina)', sets: 3, reps: '12' },
        { name: 'Rosca direta (barra)', sets: 3, reps: '10' },
      ],
      'sem_equipamento',
    )
    expect(r[0].name).toBe('Flexão de braço')
    expect(r[1]).toMatchObject({ skipped: true, tip: 'já coberto por Flexão de braço' })
    expect(r[2]).toMatchObject({ skipped: true, tip: 'sem substituto sem equipamento' })
  })

  it('"Tenho 20 minutos": mantém a ordem e corta o que não cabe', () => {
    const longo = Array.from({ length: 8 }, (_, i) => ({ name: `Ex ${i}`, sets: 4, reps: '10', restSec: 90 }))
    const r = adaptWorkout(longo, 'curto')
    const kept = r.filter((e) => !e.skipped)
    expect(kept.length).toBeGreaterThan(0)
    expect(kept.length).toBeLessThan(8)
    expect(r.findIndex((e) => e.skipped)).toBe(kept.length) // os de fora são os últimos
    expect(adaptedMinutes(r)).toBeLessThanOrEqual(SHORT_MINUTES + 2)
  })

  it('"Tenho 20 minutos": o primeiro exercício sempre fica, com menos séries se precisar', () => {
    const r = adaptWorkout([{ name: 'Longo', sets: 20, reps: '10', restSec: 300 }], 'curto')
    expect(r[0].skipped).toBeUndefined()
    expect(r[0].sets).toBeLessThan(20)
    expect(r[0].tip).toMatch(/de 20 séries/)
  })

  it('treino que já cabe em 20 minutos fica igual', () => {
    expect(adaptWorkout(plano, 'curto').every((e) => !e.skipped && !e.tip)).toBe(true)
  })
})

describe('auxiliares', () => {
  it('estimateSeconds soma séries e descansos', () => {
    expect(estimateSeconds({ sets: 3, restSec: 60 })).toBe(3 * 45 + 2 * 60)
  })
  it('isAdaptation só aceita as três opções', () => {
    expect(isAdaptation('curto')).toBe(true)
    expect(isAdaptation('outra')).toBe(false)
    expect(isAdaptation(null)).toBe(false)
  })
})
