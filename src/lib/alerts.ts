// Regras de alerta do painel do profissional (especificação, seção 6).
// São determinísticas de propósito: a IA NÃO decide quem está em "Atenção",
// ela só escreve o resumo. Assim o comportamento é previsível e explicável.

import type { DailyLog } from './database.types'
import { addDays } from './dates'

export const RULES = {
  /** dormiu menos que isso na última noite */
  minSleepHours: 6,
  /** perdeu esta quantidade (ou mais) de treinos planejados nos últimos 7 dias */
  maxMissedWorkouts: 2,
  /** bebeu menos que esta fração da meta ontem */
  minWaterRatio: 0.5,
  /** está sem registrar há esta quantidade de dias (ou mais) */
  maxDaysWithoutLog: 2,
} as const

export type AlertKind = 'sono' | 'treino' | 'agua' | 'sem_registro'

export interface Alert {
  kind: AlertKind
  /** frase curta para a lista de pacientes e a ficha */
  message: string
  /** Há quantos dias a situação se repete (1 = só o dia mais recente). Ausente: nunca registrou. */
  days?: number
  /** Datas (ISO, da mais recente para a mais antiga) dos registros que fizeram o alerta aparecer. */
  dates?: string[]
}

export interface PatientStatus {
  status: 'atencao' | 'em_dia'
  alerts: Alert[]
  /** última noite de sono registrada (hoje ou ontem) */
  lastSleep: number | null
  /** treinos feitos / planejados nos últimos 7 dias (sem contar hoje) */
  workoutsDone: number
  workoutsPlanned: number
  /** dias desde o último registro (0 = registrou hoje; null = nunca) */
  daysSinceLastLog: number | null
}

function daysBetween(fromIso: string, toIso: string): number {
  const [a, b] = [fromIso, toIso].map((d) => new Date(`${d}T12:00:00`).getTime())
  return Math.round((b - a) / 86_400_000)
}

/**
 * Calcula a situação do paciente a partir dos registros diários.
 * `todayIso` vem de fora para o cálculo ser testável e usar o fuso do aparelho.
 */
export function evaluatePatient(logs: DailyLog[], todayIso: string): PatientStatus {
  const byDate = new Map(logs.map((l) => [l.log_date, l]))
  const yesterday = addDays(todayIso, -1)
  const alerts: Alert[] = []

  // 1. Sono da última noite: o registro de hoje; se ainda não houver, o de ontem.
  const lastNight = byDate.get(todayIso) ?? byDate.get(yesterday)
  const lastSleep = lastNight?.sleep_hours ?? null
  if (lastNight && lastSleep != null && lastSleep < RULES.minSleepHours) {
    // Noites seguidas abaixo do mínimo, contando para trás a partir da última.
    const nights: string[] = []
    for (let d = lastNight.log_date; ; d = addDays(d, -1)) {
      const h = byDate.get(d)?.sleep_hours
      if (h == null || h >= RULES.minSleepHours) break
      nights.push(d)
    }
    alerts.push({ kind: 'sono', message: `Dormiu ${formatSleep(lastSleep)}`, days: nights.length, dates: nights })
  }

  // 2. Treinos dos últimos 7 dias, sem contar hoje (o treino de hoje ainda pode acontecer).
  // Só conta como falta o dia registrado com "Tinha treino planejado?" e sem "Treinei".
  // Dia sem registro não é falta: não dá para saber se a pessoa treinou.
  let planned = 0
  let done = 0
  const missedDates: string[] = []
  let firstMissed = 0
  for (let i = 1; i <= 7; i++) {
    const date = addDays(todayIso, -i)
    const log = byDate.get(date)
    if (!log?.workout_planned) continue
    planned++
    if (log.workout_done) done++
    else {
      missedDates.push(date)
      firstMissed = i
    }
  }
  if (missedDates.length >= RULES.maxMissedWorkouts) {
    alerts.push({
      kind: 'treino',
      message: `Faltou a ${missedDates.length} treinos na semana`,
      days: firstMissed,
      dates: missedDates,
    })
  }

  // 3. Água de ontem abaixo de 50% da meta.
  const y = byDate.get(yesterday)
  const lowWater = (l: DailyLog | undefined) => l?.water_liters != null && l.water_liters < l.water_goal_liters * RULES.minWaterRatio
  if (y?.water_liters != null && lowWater(y)) {
    const waterDates: string[] = []
    for (let d = yesterday; lowWater(byDate.get(d)); d = addDays(d, -1)) waterDates.push(d)
    alerts.push({
      kind: 'agua',
      message: `Água: ${formatLiters(y.water_liters)} de ${formatLiters(y.water_goal_liters)}`,
      days: waterDates.length,
      dates: waterDates,
    })
  }

  // 4. Sem registro há 2 dias ou mais.
  const lastDate = logs.reduce<string | null>((max, l) => (max == null || l.log_date > max ? l.log_date : max), null)
  const daysSinceLastLog = lastDate ? daysBetween(lastDate, todayIso) : null
  if (daysSinceLastLog == null || daysSinceLastLog >= RULES.maxDaysWithoutLog) {
    alerts.push({
      kind: 'sem_registro',
      message: daysSinceLastLog == null ? 'Nenhum registro ainda' : `Sem registro há ${daysSinceLastLog} dias`,
      ...(daysSinceLastLog == null ? {} : { days: daysSinceLastLog }),
    })
  }

  return {
    status: alerts.length > 0 ? 'atencao' : 'em_dia',
    alerts,
    lastSleep,
    workoutsDone: done,
    workoutsPlanned: planned,
    daysSinceLastLog,
  }
}

/**
 * A regra de cada alerta em uma frase, para o profissional (e quem testa o app)
 * saber exatamente o que faz o alerta aparecer.
 */
export const RULE_TEXT: Record<AlertKind, string> = {
  sono: `Última noite registrada com menos de ${RULES.minSleepHours}h de sono.`,
  treino: `${RULES.maxMissedWorkouts} ou mais dias, nos 7 anteriores a hoje, registrados em Rotina com "Tinha treino planejado?" marcado e "Treinei" desmarcado. Dia sem registro não conta como falta.`,
  agua: `Água de ontem abaixo de ${Math.round(RULES.minWaterRatio * 100)}% da meta.`,
  sem_registro: `Nenhum registro diário há ${RULES.maxDaysWithoutLog} dias ou mais.`,
}

/** Há quanto tempo o alerta existe, em texto: "há 3 dias", "desde ontem", "só hoje". */
export function alertSince(a: Alert): string | null {
  if (a.days == null) return null
  if (a.kind === 'sem_registro') return null // a própria mensagem já diz há quanto tempo
  if (a.kind === 'sono') return a.days === 1 ? 'última noite' : `${a.days} noites seguidas`
  if (a.days <= 1) return 'desde ontem'
  return `há ${a.days} dias`
}

/** Alerta que existe há mais tempo (o que mais pede atenção na fila). */
export function longestAlertDays(alerts: Alert[]): number {
  return alerts.reduce((m, a) => Math.max(m, a.days ?? 0), 0)
}

function formatSleep(h: number): string {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`
}

function formatLiters(l: number): string {
  return `${l.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`
}
