// Regras do "Meu plano". Espelham a migration 20261115000002_planos.sql para o
// erro aparecer na tela antes de salvar; quem garante é o banco.

import type { PlanCheck, PlanItem, PlanKind, PlanOutcome, Specialty } from './database.types'
import { addDays, fromISODate, toISODate } from './dates'

export type PlanTab = 'treino' | 'nutricao' | 'mente' | 'fisio'

/** Abas na ordem do mockup, cada uma ligada a uma especialidade e a um tipo de item. */
export const PLAN_TABS: { tab: PlanTab; label: string; area: string; specialty: Specialty; kind: PlanKind }[] = [
  { tab: 'treino', label: 'Treino', area: 'Treino', specialty: 'personal', kind: 'treino' },
  { tab: 'nutricao', label: 'Nutrição', area: 'Nutrição', specialty: 'nutricionista', kind: 'refeicao' },
  { tab: 'mente', label: 'Mente', area: 'Mente', specialty: 'psicologo', kind: 'respiracao' },
  { tab: 'fisio', label: 'Fisio', area: 'Fisioterapia', specialty: 'fisioterapeuta', kind: 'fisio' },
]

export function kindForSpecialty(s: Specialty): PlanKind {
  return PLAN_TABS.find((t) => t.specialty === s)!.kind
}

export function tabForKind(k: PlanKind) {
  return PLAN_TABS.find((t) => t.kind === k)!
}

/** Nome de um item de cada tipo, para botões e títulos ("Adicionar refeição"). */
export const KIND_NOUN: Record<PlanKind, string> = {
  treino: 'exercício',
  refeicao: 'refeição',
  respiracao: 'exercício de respiração',
  fisio: 'exercício',
}

export const WEEKDAYS = [
  { n: 1, short: 'Seg', letter: 'S' },
  { n: 2, short: 'Ter', letter: 'T' },
  { n: 3, short: 'Qua', letter: 'Q' },
  { n: 4, short: 'Qui', letter: 'Q' },
  { n: 5, short: 'Sex', letter: 'S' },
  { n: 6, short: 'Sáb', letter: 'S' },
  { n: 7, short: 'Dom', letter: 'D' },
] as const

/** Dia da semana ISO (1 = segunda … 7 = domingo) de "2026-11-13". */
export function isoWeekday(iso: string): number {
  const d = fromISODate(iso).getDay()
  return d === 0 ? 7 : d
}

/** "Todos os dias", "Seg a sex", "Fim de semana" ou "Seg, qua e sex". */
export function weekdaysLabel(days: number[]): string {
  const set = [...new Set(days)].sort((a, b) => a - b)
  if (set.length === 7) return 'Todos os dias'
  if (set.join() === '1,2,3,4,5') return 'Seg a sex'
  if (set.join() === '6,7') return 'Fim de semana'
  const names = set.map((n) => WEEKDAYS[n - 1].short.toLowerCase())
  names[0] = names[0][0].toUpperCase() + names[0].slice(1)
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

/** "07:30:00" → "07:30" */
export function shortTime(t: string | null): string {
  return t ? t.slice(0, 5) : ''
}

/** Itens que valem no dia, na ordem certa (refeições pelo horário). */
export function itemsForDay<T extends Pick<PlanItem, 'weekdays' | 'kind' | 'meal_time' | 'position'>>(
  items: T[],
  iso: string,
): T[] {
  const wd = isoWeekday(iso)
  return items
    .filter((i) => i.weekdays.includes(wd))
    .sort((a, b) =>
      a.kind === 'refeicao' && b.kind === 'refeicao'
        ? (a.meal_time ?? '').localeCompare(b.meal_time ?? '')
        : a.position - b.position,
    )
}

/** Linha de detalhe do item: "4 × 10 · 40 kg", "12:30 · Arroz…", "5 min". */
export function itemDetail(i: Pick<PlanItem, 'kind' | 'sets' | 'reps' | 'load' | 'meal_time' | 'foods' | 'duration_min'>): string {
  if (i.kind === 'refeicao') return [shortTime(i.meal_time), i.foods].filter(Boolean).join(' · ')
  if (i.kind === 'respiracao') return i.duration_min ? `${i.duration_min} min` : ''
  const sets = i.sets ? `${i.sets} × ${i.reps ?? ''}`.trim() : ''
  return [sets, i.load].filter(Boolean).join(' · ')
}

/** Minutos somados da respiração, ou a quantidade de itens: "Exercícios de hoje · 3". */
export function dayHeadline(kind: PlanKind, items: Pick<PlanItem, 'duration_min'>[]): string {
  if (items.length === 0) return 'Nada para hoje'
  if (kind === 'refeicao') return `${items.length} ${items.length === 1 ? 'refeição' : 'refeições'} hoje`
  if (kind === 'respiracao') {
    const min = items.reduce((s, i) => s + (i.duration_min ?? 0), 0)
    return `Respiração de hoje · ${min} min`
  }
  return `${items.length} ${items.length === 1 ? 'exercício' : 'exercícios'} hoje`
}

// --------------------------------------------------------------- adesão

export interface Adherence {
  done: number
  planned: number
}

/**
 * Quanto do plano foi cumprido nos dias informados. Um item só conta a partir
 * do dia em que foi criado (não cobra o passado de um item novo).
 */
export function adherence(
  items: Pick<PlanItem, 'id' | 'weekdays' | 'created_at'>[],
  checks: { item_id: string; check_date: string; outcome?: PlanOutcome }[],
  days: string[],
): Adherence {
  // "Não consegui" fica registrado, mas não conta como feito.
  const done = new Set(checks.filter((c) => c.outcome !== 'nao_consegui').map((c) => `${c.item_id}|${c.check_date}`))
  let planned = 0
  let ok = 0
  for (const day of days) {
    const wd = isoWeekday(day)
    for (const i of items) {
      if (!i.weekdays.includes(wd) || toISODate(new Date(i.created_at)) > day) continue
      planned++
      if (done.has(`${i.id}|${day}`)) ok++
    }
  }
  return { done: ok, planned }
}

/** Os 7 dias que terminam ontem (hoje ainda está acontecendo). */
export function lastWeekDays(todayIso: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(todayIso, i - 7))
}

// --------------------------------------------------------- formulário

export const TITLE_MAX = 80
export const NOTES_MAX = 200
export const FOODS_MAX = 300
export const PLAN_NOTE_MAX = 300
export const PAIN_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

export interface PlanItemValues {
  title: string
  weekdays: number[]
  sets: string
  reps: string
  load: string
  mealTime: string
  foods: string
  durationMin: string
  notes: string
  videoUrl: string
  /** Refeição: calorias e macros opcionais (texto do formulário; vazio = sem número). */
  kcal: string
  protein: string
  carbs: string
  fat: string
  showMacros: boolean
  /** Uma substituição por linha. */
  alternatives: string
}

export type PlanItemErrors = Partial<Record<keyof PlanItemValues, string>>

export function initialPlanValues(item?: PlanItem | null): PlanItemValues {
  return {
    title: item?.title ?? '',
    weekdays: item?.weekdays ?? [1, 2, 3, 4, 5],
    sets: item?.sets != null ? String(item.sets) : '',
    reps: item?.reps ?? '',
    load: item?.load ?? '',
    mealTime: shortTime(item?.meal_time ?? null),
    foods: item?.foods ?? '',
    durationMin: item?.duration_min != null ? String(item.duration_min) : '',
    notes: item?.notes ?? '',
    videoUrl: item?.video_url ?? '',
    kcal: item?.kcal != null ? String(item.kcal) : '',
    protein: item?.protein_g != null ? formatGrams(item.protein_g) : '',
    carbs: item?.carbs_g != null ? formatGrams(item.carbs_g) : '',
    fat: item?.fat_g != null ? formatGrams(item.fat_g) : '',
    showMacros: item?.show_macros ?? false,
    alternatives: (item?.alternatives ?? []).join('\n'),
  }
}

export const MAX_ALTERNATIVES = 5
export const ALTERNATIVE_MAX = 80

const grams = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
function formatGrams(n: number): string {
  return grams.format(n)
}

/** "15,5" → 15.5; vazio → null; inválido → NaN. */
function decimal(raw: string): number | null {
  const t = raw.trim().replace(',', '.')
  if (!t) return null
  return /^\d+(\.\d)?$/.test(t) ? Number(t) : NaN
}

/** Substituições do formulário: uma por linha, sem vazias nem repetidas. */
export function parseAlternatives(raw: string): string[] {
  const seen = new Set<string>()
  return raw
    .split('\n')
    .map((a) => a.trim())
    .filter((a) => a && !seen.has(a.toLowerCase()) && seen.add(a.toLowerCase()))
}

/** A nutricionista preencheu calorias, macros, substituições ou marcou para mostrar? */
export function hasNutrition(v: PlanItemValues): boolean {
  return Boolean(v.kcal.trim() || v.protein.trim() || v.carbs.trim() || v.fat.trim() || v.showMacros || v.alternatives.trim())
}

function intIn(raw: string, min: number, max: number): boolean {
  const n = Number(raw)
  return /^\d+$/.test(raw.trim()) && n >= min && n <= max
}

export function isValidVideoUrl(raw: string): boolean {
  const v = raw.trim()
  if (!v) return true
  if (v.length > 300 || !v.startsWith('https://')) return false
  try {
    return Boolean(new URL(v).hostname.includes('.'))
  } catch {
    return false
  }
}

export function validatePlanItem(kind: PlanKind, v: PlanItemValues): PlanItemErrors {
  const e: PlanItemErrors = {}
  const title = v.title.trim()
  if (title.length < 2 || title.length > TITLE_MAX) e.title = `Dê um nome com 2 a ${TITLE_MAX} caracteres.`
  if (v.weekdays.length === 0) e.weekdays = 'Escolha pelo menos um dia.'

  if (kind === 'treino' || kind === 'fisio') {
    if (!intIn(v.sets, 1, 20)) e.sets = 'Séries: um número de 1 a 20.'
    if (v.reps.trim().length > 20) e.reps = 'Use no máximo 20 caracteres.'
    if (v.load.trim().length > 20) e.load = 'Use no máximo 20 caracteres.'
  }
  if (kind === 'refeicao') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.mealTime)) e.mealTime = 'Informe o horário.'
    const foods = v.foods.trim()
    if (!foods) e.foods = 'Diga o que comer.'
    else if (foods.length > FOODS_MAX) e.foods = `Use no máximo ${FOODS_MAX} caracteres.`
    const kcal = decimal(v.kcal)
    if (kcal != null && (!Number.isInteger(kcal) || kcal > 5000)) e.kcal = 'Calorias: um número inteiro até 5000.'
    for (const k of ['protein', 'carbs', 'fat'] as const) {
      const g = decimal(v[k])
      if (g != null && (Number.isNaN(g) || g > 500)) e[k] = 'Gramas: até 500, com no máximo uma casa decimal.'
    }
    const alts = parseAlternatives(v.alternatives)
    if (alts.length > MAX_ALTERNATIVES) e.alternatives = `Use até ${MAX_ALTERNATIVES} substituições.`
    else if (alts.some((a) => a.length > ALTERNATIVE_MAX)) e.alternatives = `Cada substituição com até ${ALTERNATIVE_MAX} caracteres.`
  }
  if (kind === 'respiracao' && !intIn(v.durationMin, 1, 120)) e.durationMin = 'Duração: de 1 a 120 minutos.'

  if (v.notes.trim().length > NOTES_MAX) e.notes = `Use no máximo ${NOTES_MAX} caracteres.`
  if (!isValidVideoUrl(v.videoUrl)) e.videoUrl = 'Cole um link que comece com https://'
  return e
}

/**
 * Linha pronta para gravar em plan_items: só os campos do tipo, o resto vai nulo.
 * `withNutrition`: inclui calorias, macros e substituições. Só vai quando foram usadas
 * (agora ou antes), para salvar refeições funcionar mesmo sem a migration de nutrição.
 */
export function toPlanItemRow(kind: PlanKind, v: PlanItemValues, withNutrition = false) {
  const exercise = kind === 'treino' || kind === 'fisio'
  const opt = (s: string) => s.trim() || null
  return {
    kind,
    title: v.title.trim(),
    weekdays: [...new Set(v.weekdays)].sort((a, b) => a - b),
    sets: exercise ? Number(v.sets) : null,
    reps: exercise ? opt(v.reps) : null,
    load: kind === 'treino' ? opt(v.load) : null,
    meal_time: kind === 'refeicao' ? v.mealTime : null,
    foods: kind === 'refeicao' ? v.foods.trim() : null,
    duration_min: kind === 'respiracao' ? Number(v.durationMin) : null,
    notes: opt(v.notes),
    video_url: opt(v.videoUrl),
    ...(kind === 'refeicao' && withNutrition
      ? {
          kcal: decimal(v.kcal),
          protein_g: decimal(v.protein),
          carbs_g: decimal(v.carbs),
          fat_g: decimal(v.fat),
          show_macros: v.showMacros,
          alternatives: parseAlternatives(v.alternatives),
        }
      : {}),
  }
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

/** "600 kcal · P 40 g · C 70 g · G 15,5 g" (só o que foi informado). Nada informado: ''. */
export function macrosLabel(i: Pick<PlanItem, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>): string {
  const g = (label: string, n: number | null | undefined) => (n != null ? `${label} ${formatGrams(n)} g` : '')
  return [i.kcal != null ? `${i.kcal} kcal` : '', g('P', i.protein_g), g('C', i.carbs_g), g('G', i.fat_g)]
    .filter(Boolean)
    .join(' · ')
}

/** Soma de calorias e macros de uma lista de refeições (o que não foi informado conta zero). */
export function sumMacros(items: Pick<PlanItem, 'kcal' | 'protein_g' | 'carbs_g' | 'fat_g'>[]): Macros {
  return items.reduce<Macros>(
    (t, i) => ({
      kcal: t.kcal + (i.kcal ?? 0),
      protein: t.protein + Number(i.protein_g ?? 0),
      carbs: t.carbs + Number(i.carbs_g ?? 0),
      fat: t.fat + Number(i.fat_g ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
}

export interface MealDay {
  date: string
  planned: number
  asPlanned: number
  substituted: number
  missed: number
  /** Sem registro (nem feito, nem substituído, nem "não consegui"). */
  unknown: number
  /** Calorias planejadas no dia e as das refeições feitas como planejado. */
  kcalPlanned: number
  kcalAsPlanned: number
}

/**
 * Resumo diário para a nutricionista: refeições planejadas em cada dia e como cada uma
 * foi registrada. Sem registro conta à parte: não quer dizer que a pessoa não comeu.
 */
export function mealDays(
  items: Pick<PlanItem, 'id' | 'kind' | 'weekdays' | 'kcal'>[],
  checks: Pick<PlanCheck, 'item_id' | 'check_date' | 'outcome'>[],
  days: string[],
): MealDay[] {
  const meals = items.filter((i) => i.kind === 'refeicao')
  return days.map((date) => {
    const wd = isoWeekday(date)
    const planned = meals.filter((m) => m.weekdays.includes(wd))
    const day: MealDay = { date, planned: planned.length, asPlanned: 0, substituted: 0, missed: 0, unknown: 0, kcalPlanned: 0, kcalAsPlanned: 0 }
    for (const m of planned) {
      day.kcalPlanned += m.kcal ?? 0
      const c = checks.find((x) => x.item_id === m.id && x.check_date === date)
      if (!c) day.unknown++
      else if (c.outcome === 'feito') {
        day.asPlanned++
        day.kcalAsPlanned += m.kcal ?? 0
      } else if (c.outcome === 'substituido') day.substituted++
      else day.missed++
    }
    return day
  })
}

/** Põe antes quem já montou plano nesta área e deixa para o fim os que ainda não montaram (estável). */
export function plannedFirst<T>(ids: T[], hasPlan: (id: T) => boolean): T[] {
  return [...ids.filter(hasPlan), ...ids.filter((id) => !hasPlan(id))]
}

// ------------------------------------------------------- registro da refeição

export const OUTCOME_LABEL: Record<PlanOutcome, string> = {
  feito: 'Comi como planejado',
  substituido: 'Substituí',
  nao_consegui: 'Não consegui',
}

export const CHECK_NOTE_MAX = 200
