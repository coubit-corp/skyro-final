import { describe, expect, it } from 'vitest'
import { buildTimeline, evolutionDate, filterTimeline, validateMilestone, workoutSummary, type EvolutionSources } from './evolution'

const TODAY = '2026-11-26'
const base: EvolutionSources = {
  history: [
    { id: 'h1', kind: 'treino', occurred_on: '2026-11-20', title: 'Treino A', source: 'hevy', details: { duration_min: 50, exercises: [{ name: 'Supino', sets: [{ reps: 10, weight_kg: 40 }, { reps: 8, weight_kg: 45.5 }] }] } },
    { id: 'h2', kind: 'marco', occurred_on: '2026-08-10', title: 'Primeiro desafio', source: 'manual', details: {} },
  ],
  workoutDays: ['2026-11-20', '2026-11-25'],
  meals: [{ date: '2026-11-25', title: 'Almoço', outcome: 'substituido', note: 'troquei o arroz' }],
  adjustments: [{ id: 'a1', date: '2026-11-22', kind: 'trocar_dia', status: 'aceito', proposal: 'Sábado às 9h' }],
  challenges: [
    { id: 'c1', title: 'Semana 1', starts_on: '2026-11-16', ends_on: '2026-11-22', goal: 3, done: 3, leftOn: null },
    { id: 'c2', title: 'Semana 2', starts_on: '2026-11-23', ends_on: '2026-11-29', goal: 3, done: 1, leftOn: null },
    { id: 'c3', title: 'Semana 3', starts_on: '2026-11-30', ends_on: '2026-12-06', goal: 3, done: 0, leftOn: null },
  ],
}

describe('linha do tempo da evolução', () => {
  const t = buildTimeline(base, TODAY)
  it('ordena pela data real, da mais recente para a mais antiga', () => {
    expect(t.map((i) => i.date)).toEqual([...t.map((i) => i.date)].sort().reverse())
    expect(t.at(-1)).toMatchObject({ kind: 'marco', date: '2026-08-10', origin: 'Adicionado por você' })
  })
  it('não repete o treino do dia quando há um importado na mesma data', () => {
    const treinos = t.filter((i) => i.kind === 'treino')
    expect(treinos.map((i) => [i.date, i.title])).toEqual([
      ['2026-11-25', 'Treino feito'],
      ['2026-11-20', 'Treino A'],
    ])
    expect(treinos[1].origin).toBe('Importado do Hevy')
  })
  it('mostra o resultado do desafio e esconde o que ainda não começou', () => {
    const d = t.filter((i) => i.kind === 'desafio')
    expect(d.map((i) => [i.title, i.date, i.subtitle])).toEqual([
      ['Semana 2', TODAY, '1 de 3 treinos · em andamento'],
      ['Semana 1', '2026-11-22', '3 de 3 treinos · meta cumprida'],
    ])
  })
  it('quem saiu do desafio aparece no dia da saída', () => {
    const left = buildTimeline(
      { ...base, challenges: [{ ...base.challenges[0], leftOn: '2026-11-18' }] },
      TODAY,
    ).find((i) => i.kind === 'desafio')
    expect(left).toMatchObject({ date: '2026-11-18', subtitle: 'Você saiu desta rodada' })
  })
  it('descreve refeição e ajuste', () => {
    expect(t.find((i) => i.kind === 'alimentacao')?.subtitle).toBe('Substituí · troquei o arroz')
    expect(t.find((i) => i.kind === 'meta')).toMatchObject({
      title: 'Pedido de ajuste: Trocar o dia',
      subtitle: 'Ajuste aceito · Sábado às 9h',
    })
  })
  it('filtra por tipo e por período', () => {
    expect(filterTimeline(t, 'treino', 'tudo', TODAY)).toHaveLength(2)
    expect(filterTimeline(t, 'tudo', '7', TODAY).every((i) => i.date >= '2026-11-20')).toBe(true)
    expect(filterTimeline(t, 'tudo', '7', TODAY).some((i) => i.date === '2026-11-20')).toBe(true)
    expect(filterTimeline(t, 'marco', '30', TODAY)).toHaveLength(0)
    expect(filterTimeline(t, 'marco', 'tudo', TODAY)).toHaveLength(1)
  })
})

describe('resumo do treino importado', () => {
  it('conta exercícios, séries e a maior carga', () => {
    expect(workoutSummary(base.history[0].details)).toBe('1 exercício · 2 séries · maior carga 45,5 kg · 50 min')
    expect(workoutSummary({})).toBe('')
  })
})

describe('marco manual', () => {
  it('exige texto e data que já passou', () => {
    expect(validateMilestone('  ', '2026-08-01', TODAY)).toMatch(/conquistou/)
    expect(validateMilestone('Corri 5 km', '2026-12-01', TODAY)).toMatch(/futuro/)
    expect(validateMilestone('Corri 5 km', '', TODAY)).toMatch(/data/)
    expect(validateMilestone('Corri 5 km', TODAY, TODAY)).toBeNull()
  })
})

describe('data na linha do tempo', () => {
  it('mostra o ano quando não é o ano atual', () => {
    expect(evolutionDate('2024-03-28', TODAY)).toMatch(/2024$/)
    expect(evolutionDate('2026-03-28', TODAY)).not.toMatch(/2026/)
  })
})
