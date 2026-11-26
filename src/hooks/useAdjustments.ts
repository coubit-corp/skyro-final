// Pedidos de ajuste. Quem pode pedir, propor e decidir é o banco que confere
// (RLS e funções); aqui só buscamos e enviamos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import type { AdjustmentKind, AdjustmentRequest } from '../lib/adjustments'
import { supabase } from '../lib/supabase'

const REFRESH = 30_000

/** O banco ainda não tem a tabela de pedidos (migration não aplicada)? */
function isUnavailable(error: { message: string }): boolean {
  return /schema cache|does not exist|could not find/i.test(error.message)
}

function friendly(message: string): string {
  if (/pedido_indisponivel/.test(message)) return 'Esse pedido já foi respondido ou não está mais disponível.'
  if (/row-level security/i.test(message)) {
    return 'Só dá para pedir ajuste a um profissional que acompanha sua rotina agora.'
  }
  return message
}

function fail(error: { message: string } | null) {
  if (error) throw new Error(friendly(error.message))
}

/** Pedidos em que eu sou o cliente ('person') ou o profissional ('professional'). null = recurso ainda não ativado no banco. */
export function useAdjustments(as: 'person' | 'professional') {
  const { session } = useAuth()
  const me = session?.user.id
  return useQuery({
    queryKey: ['adjustments', as, me],
    enabled: Boolean(me),
    refetchInterval: REFRESH,
    queryFn: async (): Promise<AdjustmentRequest[] | null> => {
      const res = await supabase
        .from('adjustment_requests')
        .select('*')
        .eq(as === 'person' ? 'person_id' : 'professional_id', me!)
        .order('created_at', { ascending: false })
        .limit(200)
      if (res.error) {
        if (isUnavailable(res.error)) return null
        throw new Error(res.error.message)
      }
      return res.data as AdjustmentRequest[]
    },
  })
}

function useAdjustmentMutation<T>(fn: (input: T, me: string) => Promise<void>) {
  const { session } = useAuth()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: T) => fn(input, session!.user.id),
    onSettled: () => client.invalidateQueries({ queryKey: ['adjustments'] }),
  })
}

export function useRequestAdjustment() {
  return useAdjustmentMutation<{ professionalId: string; kind: AdjustmentKind; message: string }>(async (input, me) => {
    fail(
      (
        await supabase.from('adjustment_requests').insert({
          person_id: me,
          professional_id: input.professionalId,
          kind: input.kind,
          message: input.message.trim(),
        })
      ).error,
    )
  })
}

export function useRespondAdjustment() {
  return useAdjustmentMutation<{ id: string; proposal: string }>(async ({ id, proposal }) => {
    fail((await supabase.rpc('respond_adjustment', { p_request: id, p_proposal: proposal.trim() })).error)
  })
}

export function useDecideAdjustment() {
  return useAdjustmentMutation<{ id: string; accept: boolean }>(async ({ id, accept }) => {
    fail((await supabase.rpc('decide_adjustment', { p_request: id, p_accept: accept })).error)
  })
}

export function useCancelAdjustment() {
  return useAdjustmentMutation<string>(async (id) => {
    fail((await supabase.rpc('cancel_adjustment', { p_request: id })).error)
  })
}
