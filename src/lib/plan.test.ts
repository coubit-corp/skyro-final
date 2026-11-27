import { describe, expect, it } from 'vitest'
import type { PlanItem } from './database.types'
import {
  adherence,
  dayHeadline,
  hasNutrition,
  initialPlanValues,
  isoWeekday,
  isValidVideoUrl,
  itemDetail,
  itemsForDay,
  kindForSpecialty,
  lastWeekDays,
  macrosLabel,
  mealDays,
  parseAlternatives,
  plannedFirst,
  sumMacros,
  toPlanItemRow,
  validatePlanItem,
  weekdaysLabel,
  type PlanItemValues,
} from './plan'

function item(over: Partial<PlanItem>): PlanItem {
  return {
    id: 'i', professional_id: 'p', person_id: 'x', kind: 'treino', title: 'Supino', weekdays: [1, 3, 5],
    sets: 4, reps: '10', load: '30 kg', meal_time: null, foods: null, duration_min: null, notes: null,
    video_url: null, position: 1, created_at: '2026-11-01T12:00:00Z', updated_at: '2026-11-01T12:00:00Z', ...over,
  }
}

describe('plano: especialidades e dias', () => {
  it('cada especialidade monta o seu tipo de item', () => {
    expect(kindForSpecialty('personal')).toBe('treino')
    expect(kindForSpecialty('nutricionista')).toBe('refeicao')
    expect(kindForSpecialty('psicologo')).toBe('respiracao')
    expect(kindForSpecialty('fisioterapeuta')).toBe('fisio')
  })
  it('dia da semana ISO: segunda é 1 e domingo é 7', () => {
    expect(isoWeekday('2026-11-09')).toBe(1)
    expect(isoWeekday('2026-11-13')).toBe(5)
    expect(isoWeekday('2026-11-15')).toBe(7)
  })
  it('descreve os dias em português', () => {
    expect(weekdaysLabel([1, 2, 3, 4, 5, 6, 7])).toBe('Todos os dias')
    expect(weekdaysLabel([5, 4, 3, 2, 1])).toBe('Seg a sex')
    expect(weekdaysLabel([6, 7])).toBe('Fim de semana')
    expect(weekdaysLabel([1, 3, 5])).toBe('Seg, qua e sex')
    expect(weekdaysLabel([2])).toBe('Ter')
  })
})

describe('plano do dia', () => {
  it('mostra só os itens do dia, refeições pelo horário', () => {
    const items = [
      item({ id: 'jantar', kind: 'refeicao', meal_time: '19:30:00', weekdays: [1, 2, 3, 4, 5, 6, 7], position: 1 }),
      item({ id: 'cafe', kind: 'refeicao', meal_time: '07:30:00', weekdays: [1, 2, 3, 4, 5, 6, 7], position: 2 }),
      item({ id: 'so-sabado', kind: 'refeicao', meal_time: '10:00:00', weekdays: [6] }),
    ]
    expect(itemsForDay(items, '2026-11-13').map((i) => i.id)).toEqual(['cafe', 'jantar'])
  })
  it('detalhe de cada tipo', () => {
    expect(itemDetail(item({}))).toBe('4 × 10 · 30 kg')
    expect(itemDetail(item({ kind: 'fisio', sets: 3, reps: '30 s', load: null }))).toBe('3 × 30 s')
    expect(itemDetail(item({ kind: 'refeicao', meal_time: '12:30:00', foods: 'Arroz e feijão' }))).toBe('12:30 · Arroz e feijão')
    expect(itemDetail(item({ kind: 'respiracao', duration_min: 5 }))).toBe('5 min')
  })
  it('título do card do dia', () => {
    expect(dayHeadline('respiracao', [{ duration_min: 5 }, { duration_min: 4 }])).toBe('Respiração de hoje · 9 min')
    expect(dayHeadline('fisio', [{ duration_min: null }])).toBe('1 exercício hoje')
    expect(dayHeadline('refeicao', [])).toBe('Nada para hoje')
  })
})

describe('adesão da semana', () => {
  it('conta o que estava previsto e o que foi feito', () => {
    const items = [item({ id: 'a', weekdays: [1, 3, 5] }), item({ id: 'b', weekdays: [1, 2, 3, 4, 5, 6, 7] })]
    const days = ['2026-11-09', '2026-11-10', '2026-11-11'] // seg, ter, qua
    const checks = [
      { item_id: 'a', check_date: '2026-11-09' },
      { item_id: 'b', check_date: '2026-11-10' },
      { item_id: 'b', check_date: '2026-11-12' }, // fora do período
    ]
    expect(adherence(items, checks, days)).toEqual({ done: 2, planned: 5 })
  })
  it('"não consegui" fica registrado mas não conta como feito', () => {
    const items = [item({ id: 'a', weekdays: [1, 2, 3, 4, 5, 6, 7], created_at: '2026-11-01T12:00:00Z' })]
    const checks = [
      { item_id: 'a', check_date: '2026-11-09', outcome: 'substituido' as const },
      { item_id: 'a', check_date: '2026-11-10', outcome: 'nao_consegui' as const },
    ]
    expect(adherence(items, checks, ['2026-11-09', '2026-11-10'])).toEqual({ done: 1, planned: 2 })
  })
  it('item novo não cobra os dias antes de existir', () => {
    const items = [item({ id: 'novo', weekdays: [1, 2, 3, 4, 5, 6, 7], created_at: '2026-11-11T15:00:00Z' })]
    expect(adherence(items, [], ['2026-11-09', '2026-11-10', '2026-11-11'])).toEqual({ done: 0, planned: 1 })
  })
  it('a semana termina ontem', () => {
    const w = lastWeekDays('2026-11-13')
    expect(w).toHaveLength(7)
    expect(w[0]).toBe('2026-11-06')
    expect(w[6]).toBe('2026-11-12')
  })
})

describe('formulário do item', () => {
  it('treino exige séries de 1 a 20', () => {
    const v = { ...initialPlanValues(), title: 'Supino', sets: '0' }
    expect(validatePlanItem('treino', v).sets).toBeDefined()
    expect(validatePlanItem('treino', { ...v, sets: '4' })).toEqual({})
  })
  it('refeição exige horário e alimentos', () => {
    const v = { ...initialPlanValues(), title: 'Almoço' }
    const e = validatePlanItem('refeicao', v)
    expect(e.mealTime).toBeDefined()
    expect(e.foods).toBeDefined()
    expect(validatePlanItem('refeicao', { ...v, mealTime: '12:30', foods: 'Arroz' })).toEqual({})
  })
  it('respiração exige duração e todos exigem um dia', () => {
    const v = { ...initialPlanValues(), title: '4-7-8', weekdays: [] }
    const e = validatePlanItem('respiracao', v)
    expect(e.durationMin).toBeDefined()
    expect(e.weekdays).toBeDefined()
  })
  it('vídeo só com https', () => {
    expect(isValidVideoUrl('')).toBe(true)
    expect(isValidVideoUrl('https://youtu.be/abc')).toBe(true)
    expect(isValidVideoUrl('http://youtu.be/abc')).toBe(false)
    expect(isValidVideoUrl('javascript:alert(1)')).toBe(false)
  })
  it('grava só os campos do tipo', () => {
    const v = { ...initialPlanValues(), title: ' Almoço ', mealTime: '12:30', foods: 'Arroz', sets: '4', load: '10 kg', weekdays: [3, 1, 1] }
    const row = toPlanItemRow('refeicao', v)
    expect(row).toMatchObject({ title: 'Almoço', meal_time: '12:30', foods: 'Arroz', sets: null, load: null, weekdays: [1, 3] })
    expect(toPlanItemRow('fisio', { ...v, sets: '3', reps: '15' })).toMatchObject({ sets: 3, reps: '15', load: null, foods: null })
  })
})

describe('plannedFirst', () => {
  it('põe quem tem plano antes de quem ainda não montou, mantendo a ordem de cada grupo', () => {
    const comPlano = new Set(['pedro', 'ana'])
    expect(plannedFirst(['bruno', 'pedro', 'carla', 'ana'], (id) => comPlano.has(id))).toEqual(['pedro', 'ana', 'bruno', 'carla'])
  })

  it('não muda nada quando todos têm plano ou ninguém tem', () => {
    expect(plannedFirst(['a', 'b'], () => true)).toEqual(['a', 'b'])
    expect(plannedFirst(['a', 'b'], () => false)).toEqual(['a', 'b'])
  })
})

describe('nutrição: macros, substituições e resumo da semana', () => {
  const values = (patch: Partial<PlanItemValues> = {}): PlanItemValues => ({
    ...initialPlanValues(null),
    title: 'Almoço',
    mealTime: '12:30',
    foods: 'Arroz e feijão',
    ...patch,
  })

  it('parseAlternatives: uma por linha, sem vazias nem repetidas', () => {
    expect(parseAlternatives(' Macarrão \n\nmacarrão\nOmelete ')).toEqual(['Macarrão', 'Omelete'])
  })

  it('valida calorias, gramas e substituições', () => {
    expect(validatePlanItem('refeicao', values({ kcal: '600', protein: '40,5', alternatives: 'a\nb' }))).toEqual({})
    const e = validatePlanItem('refeicao', values({ kcal: '600.5', fat: '700', alternatives: 'a\nb\nc\nd\ne\nf' }))
    expect(Object.keys(e).sort()).toEqual(['alternatives', 'fat', 'kcal'])
    expect(validatePlanItem('refeicao', values({ carbs: '10,25' })).carbs).toBeDefined()
  })

  it('só manda os campos de nutrição quando foram usados', () => {
    expect(toPlanItemRow('refeicao', values())).not.toHaveProperty('kcal')
    expect(hasNutrition(values())).toBe(false)
    const v = values({ kcal: '600', protein: '40,5', showMacros: true, alternatives: 'Omelete' })
    expect(hasNutrition(v)).toBe(true)
    expect(toPlanItemRow('refeicao', v, true)).toMatchObject({
      kcal: 600,
      protein_g: 40.5,
      carbs_g: null,
      fat_g: null,
      show_macros: true,
      alternatives: ['Omelete'],
    })
    // Treino nunca leva campos de nutrição.
    expect(toPlanItemRow('treino', { ...v, sets: '3' }, true)).not.toHaveProperty('kcal')
  })

  it('initialPlanValues volta os números no formato brasileiro', () => {
    const v = initialPlanValues({ kcal: 600, protein_g: 40.5, carbs_g: null, fat_g: 15, show_macros: true, alternatives: ['a', 'b'] } as never)
    expect(v).toMatchObject({ kcal: '600', protein: '40,5', carbs: '', fat: '15', showMacros: true, alternatives: 'a\nb' })
  })

  it('macrosLabel e sumMacros', () => {
    expect(macrosLabel({ kcal: 600, protein_g: 40.5, carbs_g: null, fat_g: 15 })).toBe('600 kcal · P 40,5 g · G 15 g')
    expect(macrosLabel({})).toBe('')
    expect(sumMacros([{ kcal: 600, protein_g: 40 }, { kcal: 300, carbs_g: 50 }, {}])).toEqual({ kcal: 900, protein: 40, carbs: 50, fat: 0 })
  })

  it('mealDays separa como planejado, substituído, não conseguiu e sem registro', () => {
    const monday = '2026-11-23'
    const items = [
      { id: 'a', kind: 'refeicao' as const, weekdays: [1, 2], kcal: 500 },
      { id: 'b', kind: 'refeicao' as const, weekdays: [1], kcal: 300 },
      { id: 'c', kind: 'refeicao' as const, weekdays: [1], kcal: null },
      { id: 't', kind: 'treino' as const, weekdays: [1], kcal: null },
    ]
    const checks = [
      { item_id: 'a', check_date: monday, outcome: 'feito' as const },
      { item_id: 'b', check_date: monday, outcome: 'substituido' as const },
    ]
    expect(mealDays(items, checks, [monday, '2026-11-24'])).toEqual([
      { date: monday, planned: 3, asPlanned: 1, substituted: 1, missed: 0, unknown: 1, kcalPlanned: 800, kcalAsPlanned: 500 },
      { date: '2026-11-24', planned: 1, asPlanned: 0, substituted: 0, missed: 0, unknown: 1, kcalPlanned: 500, kcalAsPlanned: 0 },
    ])
  })
})
