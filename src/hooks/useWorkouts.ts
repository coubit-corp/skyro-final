// Meus treinos: treinos montados pela pessoa e o histórico de treinos feitos.
// Quem pode ler e gravar é o banco que confere (RLS); aqui só buscamos e enviamos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from '../auth/auth-context'
import { todayBRT } from '../lib/dates'
import type { HistoryEntry } from '../lib/evolution'
import { supabase } from '../lib/supabase'
import {
  normalizeName,
  recentExercises,
  writeDraft,
  type CatalogExercise,
  type FinishedWorkout,
  type Routine,
  type RoutineExercise,
} from '../lib/workouts'

/** O banco ainda não tem a tabela (migration não aplicada)? */
export function isUnavailable(error: { message: string }): boolean {
  return /schema cache|does not exist|could not find/i.test(error.message)
}

const NOT_ACTIVE = 'Meus treinos ainda não foi ativado no banco de dados (falta rodar a migration 20261127000006_meus_treinos.sql).'

function friendly(message: string): string {
  if (/limite_de_treinos/.test(message)) return 'Você chegou ao limite de 30 treinos montados. Apague um para criar outro.'
  if (isUnavailable({ message })) return NOT_ACTIVE
  if (/permission denied|row-level security/i.test(message)) return `Sem permissão para salvar no banco (${message}).`
  // O motivo real ajuda quem administra o app a corrigir.
  return `Não deu para salvar. Tente de novo. (${message})`
}

/** Treinos montados pela pessoa. null = recurso ainda não ativado no banco. */
export { NOT_ACTIVE as WORKOUTS_NOT_ACTIVE }

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

/**
 * Exercícios que a pessoa já usou: os do histórico (do mais recente para o mais antigo)
 * e os dos treinos montados, com o vídeo que ela anexou aos que criou.
 */
export function useKnownExercises(): CatalogExercise[] {
  const history = useWorkoutHistory()
  const routines = useRoutines()
  return useMemo(() => {
    const out = recentExercises(history.data ?? [])
    const seen = new Map(out.map((e, i) => [normalizeName(e.name), i]))
    for (const r of routines.data ?? []) {
      for (const e of r.exercises) {
        const key = normalizeName(e.name)
        const at = seen.get(key)
        if (at === undefined) {
          seen.set(key, out.length)
          out.push({ name: e.name, muscle: e.muscle, ...(e.video ? { video: e.video } : {}) })
        } else if (!out[at].video && e.video) {
          out[at] = { ...out[at], video: e.video }
        }
      }
    }
    return out
  }, [history.data, routines.data])
}
