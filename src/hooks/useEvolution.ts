// Minha Evolução: busca o que já existe na Skyro e o histórico trazido de fora.
// Quem pode ler e gravar é o banco que confere (RLS); aqui só buscamos e enviamos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import { todayBRT } from '../lib/dates'
import type { EvolutionSources, HistoryEntry } from '../lib/evolution'
import type { ImportedWorkout } from '../lib/hevy'
import { supabase } from '../lib/supabase'

const LIMIT = 2000
const CHUNK = 200

/** O banco ainda não tem a tabela (migration não aplicada)? */
function isUnavailable(error: { message: string }): boolean {
  return /schema cache|does not exist|could not find/i.test(error.message)
}

type Res<T> = { data: T[] | null; error: { message: string } | null }

/** Recurso opcional: se a tabela ou coluna ainda não existe, a linha do tempo segue sem ele. */
function optional<T>(res: Res<T>): T[] {
  if (res.error) {
    if (isUnavailable(res.error)) return []
    throw new Error(res.error.message)
  }
  return res.data ?? []
}

const PAGE = 1000
const MAX_PAGES = 20

/** Todo o histórico trazido de fora, página a página: "Desde o início" não pode cortar os mais antigos. */
async function allHistory(me: string): Promise<Res<HistoryEntry>> {
  const rows: HistoryEntry[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('history_entries')
      .select('id, kind, occurred_on, title, details, source')
      .eq('person_id', me)
      .order('occurred_on', { ascending: false })
      .order('id')
      .range(page * PAGE, (page + 1) * PAGE - 1)
    if (error) return { data: null, error }
    rows.push(...((data ?? []) as HistoryEntry[]))
    if (!data || data.length < PAGE) break
  }
  return { data: rows, error: null }
}

export interface Evolution extends EvolutionSources {
  /** false = a migration do histórico ainda não foi aplicada (sem importação nem marcos). */
  historyAvailable: boolean
}

export function useEvolution() {
  const { session } = useAuth()
  const me = session?.user.id
  return useQuery({
    queryKey: ['evolution', me],
    enabled: Boolean(me),
    queryFn: async (): Promise<Evolution> => {
      const [history, logs, meals, adjustments, participations, checkins] = await Promise.all([
        allHistory(me!),
        supabase
          .from('daily_logs')
          .select('log_date')
          .eq('user_id', me!)
          .eq('workout_done', true)
          .order('log_date', { ascending: false })
          .limit(LIMIT),
        supabase
          .from('plan_checks')
          .select('check_date, outcome, note, plan_items!inner(kind, title)')
          .eq('person_id', me!)
          .eq('plan_items.kind', 'refeicao')
          .order('check_date', { ascending: false })
          .limit(LIMIT),
        supabase
          .from('adjustment_requests')
          .select('id, kind, status, proposal, created_at')
          .eq('person_id', me!)
          .order('created_at', { ascending: false })
          .limit(LIMIT),
        supabase
          .from('challenge_participants')
          .select('challenge_id, weekly_goal, left_at, challenges(title, starts_on, ends_on)')
          .eq('user_id', me!)
          .limit(LIMIT),
        supabase.from('challenge_checkins').select('challenge_id').eq('user_id', me!).limit(LIMIT * 4),
      ])

      const historyAvailable = !(history.error && isUnavailable(history.error))
      const done = new Map<string, number>()
      for (const c of optional(checkins as Res<{ challenge_id: string }>)) {
        done.set(c.challenge_id, (done.get(c.challenge_id) ?? 0) + 1)
      }
      const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
      return {
        historyAvailable,
        history: optional(history),
        workoutDays: optional(logs as Res<{ log_date: string }>).map((l) => l.log_date),
        meals: optional(
          meals as unknown as Res<{ check_date: string; outcome: string; note: string | null; plan_items: { title: string } }>,
        ).map((m) => ({ date: m.check_date, title: m.plan_items.title, outcome: m.outcome, note: m.note })),
        adjustments: optional(
          adjustments as Res<{ id: string; kind: string; status: string; proposal: string | null; created_at: string }>,
        ).map((a) => ({ ...a, date: dateFmt.format(new Date(a.created_at)) })),
        challenges: optional(
          participations as unknown as Res<{
            challenge_id: string
            weekly_goal: number
            left_at: string | null
            challenges: { title: string; starts_on: string; ends_on: string } | null
          }>,
        )
          .filter((p) => p.challenges)
          .map((p) => ({
            id: p.challenge_id,
            title: p.challenges!.title,
            starts_on: p.challenges!.starts_on,
            ends_on: p.challenges!.ends_on,
            goal: p.weekly_goal,
            done: done.get(p.challenge_id) ?? 0,
            leftOn: p.left_at ? dateFmt.format(new Date(p.left_at)) : null,
          })),
      }
    },
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['evolution'] })
}

/** Grava os treinos importados. Os que já estavam (mesma chave de origem) são ignorados pelo banco. */
export function useImportWorkouts() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (workouts: ImportedWorkout[]): Promise<{ added: number; repeated: number }> => {
      let added = 0
      for (let i = 0; i < workouts.length; i += CHUNK) {
        const rows = workouts.slice(i, i + CHUNK).map((w) => ({
          kind: 'treino',
          occurred_on: w.occurred_on,
          title: w.title,
          details: w.details,
          source: 'hevy',
          source_key: w.source_key,
        }))
        const { data, error } = await supabase
          .from('history_entries')
          .upsert(rows, { onConflict: 'person_id,source,source_key', ignoreDuplicates: true })
          .select('id')
        if (error) throw new Error(error.message)
        added += data?.length ?? 0
      }
      return { added, repeated: workouts.length - added }
    },
    onSettled: invalidate,
  })
}

export function useAddMilestone() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ title, date }: { title: string; date: string }) => {
      if (date > todayBRT()) throw new Error('A data não pode ser no futuro.')
      const { error } = await supabase
        .from('history_entries')
        .insert({ kind: 'marco', occurred_on: date, title: title.trim(), source: 'manual' })
      if (error) throw new Error(error.message)
    },
    onSuccess: invalidate,
  })
}

export function useDeleteHistoryEntry() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('history_entries').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: invalidate,
  })
}
