// Minha Evolução: uma linha do tempo só, juntando o que a pessoa registrou na
// Skyro e o que trouxe de fora. Sempre pela data real da atividade.

import { addDays, longDate } from './dates'
import type { ImportedExercise } from './hevy'

export type EvolutionKind = 'treino' | 'alimentacao' | 'meta' | 'desafio' | 'marco'
export type EvolutionPeriod = '7' | '30' | 'tudo'

export const EVOLUTION_FILTERS: { value: EvolutionKind | 'tudo'; label: string }[] = [
  { value: 'tudo', label: 'Tudo' },
  { value: 'treino', label: 'Treinos' },
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'meta', label: 'Metas e ajustes' },
  { value: 'desafio', label: 'Desafios' },
  { value: 'marco', label: 'Marcos' },
]

export const EVOLUTION_PERIODS: { value: EvolutionPeriod; label: string }[] = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: 'tudo', label: 'Desde o início' },
]

export interface EvolutionItem {
  key: string
  kind: EvolutionKind
  /** Data real da atividade (AAAA-MM-DD). */
  date: string
  title: string
  subtitle?: string
  /** De onde veio, quando não foi registrado na Skyro. */
  origin?: string
  /** Id em history_entries, quando a pessoa pode apagar. */
  entryId?: string
}

export interface HistoryEntry {
  id: string
  kind: 'treino' | 'marco'
  occurred_on: string
  title: string
  details: { duration_min?: number; exercises?: ImportedExercise[] } | null
  source: 'hevy' | 'manual'
}

export interface EvolutionSources {
  history: HistoryEntry[]
  /** Dias com "treino feito" no registro diário. */
  workoutDays: string[]
  meals: { date: string; title: string; outcome: string; note: string | null }[]
  adjustments: { id: string; date: string; kind: string; status: string; proposal: string | null }[]
  challenges: { id: string; title: string; starts_on: string; ends_on: string; goal: number; done: number; leftOn: string | null }[]
}

const kg = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** "2 exercícios · 5 séries · maior carga 50 kg · 52 min" */
export function workoutSummary(details: HistoryEntry['details']): string {
  const exercises = details?.exercises ?? []
  const sets = exercises.flatMap((e) => e.sets)
  const top = Math.max(0, ...sets.map((s) => s.weight_kg ?? 0))
  const parts: string[] = []
  if (exercises.length) parts.push(`${exercises.length} ${exercises.length === 1 ? 'exercício' : 'exercícios'}`)
  if (sets.length) parts.push(`${sets.length} ${sets.length === 1 ? 'série' : 'séries'}`)
  if (top > 0) parts.push(`maior carga ${kg.format(top)} kg`)
  if (details?.duration_min) parts.push(`${details.duration_min} min`)
  return parts.join(' · ')
}

const MEAL_OUTCOME: Record<string, string> = {
  feito: 'Comi como planejado',
  substituido: 'Substituí',
  nao_consegui: 'Não consegui',
}
const ADJUSTMENT_KIND: Record<string, string> = {
  trocar_dia: 'Trocar o dia',
  aliviar: 'Aliviar a semana',
  substituir: 'Substituir algo',
  outro: 'Outro ajuste',
}
const ADJUSTMENT_STATUS: Record<string, string> = {
  aberto: 'Aguardando resposta',
  proposto: 'Proposta recebida',
  aceito: 'Ajuste aceito',
  recusado: 'Proposta recusada',
  cancelado: 'Pedido cancelado',
}

/** Junta todas as fontes, da atividade mais recente para a mais antiga. */
export function buildTimeline(s: EvolutionSources, todayIso: string): EvolutionItem[] {
  const items: EvolutionItem[] = []
  const importedDays = new Set(s.history.filter((h) => h.kind === 'treino').map((h) => h.occurred_on))

  for (const h of s.history) {
    items.push({
      key: `h-${h.id}`,
      kind: h.kind,
      date: h.occurred_on,
      title: h.title,
      subtitle: h.kind === 'treino' ? workoutSummary(h.details) || undefined : undefined,
      origin: h.source === 'hevy' ? 'Importado do Hevy' : 'Adicionado por você',
      entryId: h.id,
    })
  }
  // O "treino feito" do dia só entra se não houver um treino importado na mesma data.
  for (const d of new Set(s.workoutDays)) {
    if (!importedDays.has(d)) items.push({ key: `w-${d}`, kind: 'treino', date: d, title: 'Treino feito' })
  }
  s.meals.forEach((m, i) =>
    items.push({
      key: `m-${m.date}-${i}`,
      kind: 'alimentacao',
      date: m.date,
      title: m.title,
      subtitle: [MEAL_OUTCOME[m.outcome] ?? m.outcome, m.note].filter(Boolean).join(' · '),
    }),
  )
  for (const a of s.adjustments) {
    items.push({
      key: `a-${a.id}`,
      kind: 'meta',
      date: a.date,
      title: `Pedido de ajuste: ${ADJUSTMENT_KIND[a.kind] ?? a.kind}`,
      subtitle: [ADJUSTMENT_STATUS[a.status] ?? a.status, a.status === 'aceito' ? a.proposal : null]
        .filter(Boolean)
        .join(' · '),
    })
  }
  for (const c of s.challenges) {
    // Rodada que ainda não começou, ou que a pessoa deixou antes de começar, não faz parte da história.
    if (c.starts_on > todayIso || (c.leftOn && c.leftOn < c.starts_on)) continue
    const ended = c.ends_on < todayIso
    items.push({
      key: `c-${c.id}`,
      kind: 'desafio',
      // Quem saiu: o dia da saída. Encerrado: o dia em que terminou. Em andamento: hoje.
      date: c.leftOn ?? (ended ? c.ends_on : todayIso),
      title: c.title,
      subtitle: c.leftOn
        ? 'Você saiu desta rodada'
        : `${c.done} de ${c.goal} ${c.goal === 1 ? 'treino' : 'treinos'} · ${
            c.done >= c.goal ? 'meta cumprida' : ended ? 'meta não cumprida' : 'em andamento'
          }`,
    })
  }
  const order: EvolutionKind[] = ['marco', 'desafio', 'meta', 'treino', 'alimentacao']
  return items
    .filter((i) => i.date <= todayIso)
    .sort((a, b) => b.date.localeCompare(a.date) || order.indexOf(a.kind) - order.indexOf(b.kind) || a.key.localeCompare(b.key))
}

export function filterTimeline(
  items: EvolutionItem[],
  kind: EvolutionKind | 'tudo',
  period: EvolutionPeriod,
  todayIso: string,
): EvolutionItem[] {
  const from = period === 'tudo' ? null : addDays(todayIso, -(Number(period) - 1))
  return items.filter((i) => (kind === 'tudo' || i.kind === kind) && (!from || i.date >= from))
}

export const MILESTONE_TITLE_MAX = 120

export function validateMilestone(title: string, date: string, todayIso: string): string | null {
  const t = title.trim()
  if (!t) return 'Escreva o que você conquistou.'
  if (t.length > MILESTONE_TITLE_MAX) return `Use até ${MILESTONE_TITLE_MAX} caracteres.`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Informe a data.'
  if (date > todayIso) return 'A data não pode ser no futuro.'
  if (date < '1970-01-01') return 'Informe uma data a partir de 1970.'
  return null
}

/** Data da linha do tempo; fora do ano atual, mostra o ano ("28 de março de 2024"). */
export function evolutionDate(iso: string, todayIso: string): string {
  return iso.slice(0, 4) === todayIso.slice(0, 4) ? longDate(iso) : `${longDate(iso)} de ${iso.slice(0, 4)}`
}
