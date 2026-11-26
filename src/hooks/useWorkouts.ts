// Meus treinos: treinos montados pela pessoa e o histórico de treinos feitos.
// Quem pode ler e gravar é o banco que confere (RLS); aqui só buscamos e enviamos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import { todayBRT } from '../lib/dates'
import type { HistoryEntry } from '../lib/evolution'
import { supabase } from '../lib/supabase'
import { writeDraft, type FinishedWorkout, type Routine, type RoutineExercise } from '../lib/workouts'

/** O banco ainda não tem a tabela (migration não aplicada)? */
function isUnavailable(error: { message: string }): boolean {
  return /schema cache|does not exist|could not find/i.test(error.message)
}

function friendly(message: string): string {
  if (/limite_de_treinos/.test(message)) return 'Você chegou ao limite de 30 treinos montados. Apague um para criar outro.'
  return 'Não deu para salvar. Tente de novo.'
}

/** Treinos montados pela pessoa. null = recurso ainda não ativado no banco. */
export function useRoutines() {
  const me = useAuth().session?.user.id
  return useQuery({
    queryKey: ['workout_routines', me],
    enabled: Boolean(me),
    queryFn: async (): Promise<Routine[] | null> => {
      const { data, error } = await supabase
        .from('workout_routines')
        .select('id, name, exercises')
        .eq('person_id', me!)
        .order('created_at')
      if (error) {
        if (isUnavailable(error)) return null
        throw new Error(error.message)
      }
      return (data ?? []) as Routine[]
    },
  })
}

export function useSaveRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (r: { id?: string; name: string; exercises: RoutineExercise[] }) => {
      const row = { name: r.name.trim(), exercises: r.exercises }
      const { error } = r.id
        ? await supabase.from('workout_routines').update(row).eq('id', r.id)
        : await supabase.from('workout_routines').insert(row)
      if (error) throw new Error(friendly(error.message))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout_routines'] }),
  })
}

export function useDeleteRoutine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workout_routines').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout_routines'] }),
  })
}

const PAGE = 1000
const MAX_PAGES = 20

/** Todos os treinos feitos ou importados, do mais novo para o mais antigo. */
export function useWorkoutHistory() {
  const me = useAuth().session?.user.id
  return useQuery({
    queryKey: ['evolution', 'treinos', me],
    enabled: Boolean(me),
    queryFn: async (): Promise<HistoryEntry[]> => {
      const rows: HistoryEntry[] = []
      for (let page = 0; page < MAX_PAGES; page++) {
        const { data, error } = await supabase
          .from('history_entries')
          .select('id, kind, occurred_on, title, details, source')
          .eq('person_id', me!)
          .eq('kind', 'treino')
          .order('occurred_on', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id')
          .range(page * PAGE, (page + 1) * PAGE - 1)
        if (error) {
          if (isUnavailable(error)) return []
          throw new Error(error.message)
        }
        rows.push(...((data ?? []) as HistoryEntry[]))
        if (!data || data.length < PAGE) break
      }
      return rows
    },
  })
}

/** Grava o treino concluído no histórico, com a data de hoje, e encerra o treino em andamento. */
export function useSaveWorkout() {
  const qc = useQueryClient()
  const me = useAuth().session?.user.id
  return useMutation({
    mutationFn: async (w: FinishedWorkout) => {
      const { error } = await supabase
        .from('history_entries')
        .insert({ kind: 'treino', occurred_on: todayBRT(), title: w.title, details: w.details, source: 'skyro' })
      if (error) throw new Error(friendly(error.message))
      // Aqui, e não na tela: se a pessoa sair durante o envio, o rascunho não pode sobrar e duplicar o treino.
      if (me) writeDraft(me, null)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evolution'] }),
  })
}
