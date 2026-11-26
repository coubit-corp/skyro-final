import { addDays, weekOf } from './dates'

/** Regra explicada antes de entrar (modo competição). */
export const CHALLENGE_RULES = [
  'O desafio vai de segunda a domingo.',
  'Você escolhe sua meta de treinos na semana e ela fica fixa nesta rodada.',
  'Vale um treino por dia. O descanso faz parte do plano.',
  'Cumprir a meta vale 1 ponto e mantém sua sequência de semanas.',
] as const

export const GOAL_OPTIONS = [1, 2, 3, 4, 5, 6, 7] as const

export interface ChallengeParticipant {
  user_id: string
  weekly_goal: number
}

export interface ChallengeCheckin {
  user_id: string
  activity_date: string
}

export interface ChallengeCheer {
  from_user: string
  to_user: string
  cheer_date: string
}

export interface ChallengeLike {
  id: string
  starts_on: string
  ends_on: string
}

export type ChallengeStatus = 'proximo' | 'ativo' | 'encerrado'

export function weekStart(iso: string): string {
  return weekOf(iso)[0]
}

export function challengeStatus(c: Pick<ChallengeLike, 'starts_on' | 'ends_on'>, todayIso: string): ChallengeStatus {
  if (todayIso < c.starts_on) return 'proximo'
  if (todayIso > c.ends_on) return 'encerrado'
  return 'ativo'
}

export interface ParticipantRow {
  userId: string
  goal: number
  done: number
  met: boolean
  /** Dias da semana com treino registrado */
  days: Set<string>
  cheersToday: number
  cheeredByMeToday: boolean
}

/** Placar do desafio: quem cumpriu a meta primeiro, depois quem está mais perto dela. */
export function scoreboard(
  participants: ChallengeParticipant[],
  checkins: ChallengeCheckin[],
  cheers: ChallengeCheer[],
  me: string,
  todayIso: string,
): ParticipantRow[] {
  const rows = participants.map((p) => {
    const days = new Set(checkins.filter((c) => c.user_id === p.user_id).map((c) => c.activity_date))
    const today = cheers.filter((c) => c.to_user === p.user_id && c.cheer_date === todayIso)
    return {
      userId: p.user_id,
      goal: p.weekly_goal,
      done: days.size,
      met: days.size >= p.weekly_goal,
      days,
      cheersToday: today.length,
      cheeredByMeToday: today.some((c) => c.from_user === me),
    }
  })
  return rows.sort(
    (a, b) => Number(b.met) - Number(a.met) || b.done / b.goal - a.done / a.goal || b.done - a.done,
  )
}

/**
 * Sequência em semanas: semanas seguidas em que a pessoa cumpriu a meta de algum
 * desafio. A semana atual só conta se já foi cumprida (ela ainda não acabou).
 */
export function weeklyStreak(weeksMet: Set<string>, todayIso: string): number {
  let week = weekStart(todayIso)
  if (!weeksMet.has(week)) week = addDays(week, -7)
  let count = 0
  while (weeksMet.has(week)) {
    count++
    week = addDays(week, -7)
  }
  return count
}

/** Semanas (segunda-feira) em que a pessoa cumpriu a meta, a partir dos desafios dela. */
export function weeksMetBy(
  userId: string,
  challenges: (ChallengeLike & { participants: ChallengeParticipant[]; checkins: ChallengeCheckin[] })[],
): Set<string> {
  const weeks = new Set<string>()
  for (const c of challenges) {
    const p = c.participants.find((x) => x.user_id === userId)
    if (!p) continue
    const done = new Set(c.checkins.filter((x) => x.user_id === userId).map((x) => x.activity_date)).size
    if (done >= p.weekly_goal) weeks.add(c.starts_on)
  }
  return weeks
}

/** Dias da semana do desafio em que dá para registrar treino (até hoje). */
export function loggableDays(c: Pick<ChallengeLike, 'starts_on' | 'ends_on'>, todayIso: string): string[] {
  return weekOf(c.starts_on).filter((d) => d <= todayIso && d <= c.ends_on)
}
