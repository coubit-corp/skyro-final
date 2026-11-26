import { describe, expect, it } from 'vitest'
import { challengeStatus, loggableDays, scoreboard, weekStart, weeklyStreak, weeksMetBy } from './challenges'

describe('weekStart e challengeStatus', () => {
  it('a semana começa na segunda', () => {
    expect(weekStart('2026-11-26')).toBe('2026-11-23') // quinta → segunda
    expect(weekStart('2026-11-29')).toBe('2026-11-23') // domingo → segunda
  })
  it('status pela data de hoje', () => {
    const c = { starts_on: '2026-11-23', ends_on: '2026-11-29' }
    expect(challengeStatus(c, '2026-11-22')).toBe('proximo')
    expect(challengeStatus(c, '2026-11-26')).toBe('ativo')
    expect(challengeStatus(c, '2026-11-30')).toBe('encerrado')
  })
})

describe('scoreboard', () => {
  const participants = [
    { user_id: 'lucas', weekly_goal: 3 },
    { user_id: 'bia', weekly_goal: 2 },
    { user_id: 'rafa', weekly_goal: 3 },
  ]
  const checkins = [
    { user_id: 'lucas', activity_date: '2026-11-23' },
    { user_id: 'bia', activity_date: '2026-11-23' },
    { user_id: 'bia', activity_date: '2026-11-25' },
    { user_id: 'rafa', activity_date: '2026-11-24' },
    { user_id: 'rafa', activity_date: '2026-11-24' }, // repetido não conta duas vezes
  ]
  const cheers = [
    { from_user: 'bia', to_user: 'lucas', cheer_date: '2026-11-26' },
    { from_user: 'me', to_user: 'lucas', cheer_date: '2026-11-26' },
    { from_user: 'me', to_user: 'rafa', cheer_date: '2026-11-25' },
  ]
  it('conta treinos por dia, meta cumprida e incentivos de hoje', () => {
    const rows = scoreboard(participants, checkins, cheers, 'me', '2026-11-26')
    expect(rows.map((r) => r.userId)).toEqual(['bia', 'lucas', 'rafa'])
    expect(rows[0]).toMatchObject({ done: 2, goal: 2, met: true })
    expect(rows[1]).toMatchObject({ done: 1, cheersToday: 2, cheeredByMeToday: true })
    expect(rows[2]).toMatchObject({ done: 1, cheersToday: 0, cheeredByMeToday: false })
  })
})

describe('weeklyStreak', () => {
  it('conta semanas seguidas com meta cumprida', () => {
    const weeks = new Set(['2026-11-09', '2026-11-16'])
    expect(weeklyStreak(weeks, '2026-11-26')).toBe(2) // semana atual ainda aberta
    expect(weeklyStreak(new Set([...weeks, '2026-11-23']), '2026-11-26')).toBe(3)
    expect(weeklyStreak(new Set(['2026-11-09']), '2026-11-26')).toBe(0) // pulou uma semana
  })
})

describe('weeksMetBy', () => {
  it('semana só entra se a meta daquela rodada foi cumprida', () => {
    const challenges = [
      {
        id: 'a',
        starts_on: '2026-11-16',
        ends_on: '2026-11-22',
        participants: [{ user_id: 'lucas', weekly_goal: 2 }],
        checkins: [
          { user_id: 'lucas', activity_date: '2026-11-16' },
          { user_id: 'lucas', activity_date: '2026-11-20' },
        ],
      },
      {
        id: 'b',
        starts_on: '2026-11-23',
        ends_on: '2026-11-29',
        participants: [{ user_id: 'lucas', weekly_goal: 3 }],
        checkins: [{ user_id: 'lucas', activity_date: '2026-11-23' }],
      },
    ]
    expect([...weeksMetBy('lucas', challenges)]).toEqual(['2026-11-16'])
  })
})

describe('loggableDays', () => {
  it('só dias da semana do desafio até hoje', () => {
    expect(loggableDays({ starts_on: '2026-11-23', ends_on: '2026-11-29' }, '2026-11-25')).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
    ])
  })
})
