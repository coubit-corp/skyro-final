// Corrida: corridas registradas (history_entries com origem 'corrida') e o plano
// de corrida da pessoa. Quem pode ler e gravar é o banco (RLS); aqui só buscamos e enviamos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import { isRunDetails, type ParsedRun, type RunDetails, type RunPlan } from '../lib/running'
import { supabase } from '../lib/supabase'

function useMe(): string | undefined {
  return useAuth().session?.user.id
}

/** O banco ainda não tem a migration de corrida? */
function unavailable(message: string): boolean {
  return /schema cache|does not exist|could not find|source_check/i.test(message)
}

export interface RunEntry {
  id: string
  occurred_on: string
  title: string
  source_key: string
  details: RunDetails
}

/** Corridas, caminhadas e pedais registrados, do mais novo para o mais antigo. */
export function useRuns() {
  const me = useMe()
  return useQuery({
    queryKey: ['evolution', 'corridas', me],
    enabled: Boolean(me),
    queryFn: async (): Promise<RunEntry[]> => {
      const { data, error } = await supabase
        .from('history_entries')
        .select('id, occurred_on, title, source_key, details')
        .eq('person_id', me!)
        .eq('source', 'corrida')
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw new Error(error.message)
      return ((data ?? []) as RunEntry[]).filter((r) => isRunDetails(r.details))
    },
  })
}

/** Grava as corridas. As que já estavam (mesmo horário de início) são ignoradas pelo banco. */
export function useSaveRuns() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runs: ParsedRun[]): Promise<{ added: number; repeated: number }> => {
      const rows = runs.map((r) => ({
        kind: 'treino',
        occurred_on: r.occurred_on,
        title: r.title,
        details: r.details,
        source: 'corrida',
        source_key: r.source_key,
      }))
      const { data, error } = await supabase
        .from('history_entries')
        .upsert(rows, { onConflict: 'person_id,source,source_key', ignoreDuplicates: true })
        .select('id')
      if (error) {
        throw new Error(
          unavailable(error.message)
            ? 'A corrida ainda não foi ativada no banco de dados (falta rodar a migration 20261128000004_corrida.sql).'
            : `Não deu para salvar. Tente de novo. (${error.message})`,
        )
      }
      const added = data?.length ?? 0
      return { added, repeated: runs.length - added }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['evolution'] }),
  })
}

/** Plano de corrida. null = ainda não criou; undefined em data = recurso fora do banco. */
export function useRunPlan() {
  const me = useMe()
  return useQuery({
    queryKey: ['running_plan', me],
    enabled: Boolean(me),
    queryFn: async (): Promise<{ plan: RunPlan | null; available: boolean }> => {
      const { data, error } = await supabase
        .from('running_plans')
        .select('goal, days_per_week, level, starts_on')
        .eq('person_id', me!)
        .maybeSingle()
      if (error) {
        if (unavailable(error.message)) return { plan: null, available: false }
        throw new Error(error.message)
      }
      return { plan: (data as RunPlan | null) ?? null, available: true }
    },
  })
}

export function useSaveRunPlan() {
  const me = useMe()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ plan, exists }: { plan: RunPlan; exists: boolean }) => {
      const row = { goal: plan.goal, days_per_week: plan.days_per_week, level: plan.level, starts_on: plan.starts_on }
      const { error } = exists
        ? await supabase.from('running_plans').update(row).eq('person_id', me!)
        : await supabase.from('running_plans').insert(row)
      if (error) throw new Error(`Não deu para salvar o plano. (${error.message})`)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['running_plan', me] }),
  })
}

export function useDeleteRunPlan() {
  const me = useMe()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('running_plans').delete().eq('person_id', me!)
      if (error) throw new Error(error.message)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['running_plan', me] }),
  })
}
