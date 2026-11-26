// Ofertas de acompanhamento (Skyro Compare). Quem lê e quem escreve é o banco
// que decide (RLS); aqui só buscamos e salvamos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import type { ProfessionalOffer } from '../lib/offers'
import { toOfferRow, type OfferValues } from '../lib/offers'
import { supabase } from '../lib/supabase'

/** O banco ainda não tem a tabela de ofertas (migration não aplicada)? */
function isUnavailable(error: { message: string }): boolean {
  return /schema cache|does not exist|could not find/i.test(error.message)
}

/** Todas as ofertas que eu posso ver, por profissional. null = recurso ainda não ativado no banco. */
export function useOffers() {
  const { session } = useAuth()
  const me = session?.user.id
  return useQuery({
    queryKey: ['offers', me],
    enabled: Boolean(me),
    queryFn: async (): Promise<Map<string, ProfessionalOffer> | null> => {
      const res = await supabase.from('professional_offers').select('*')
      if (res.error) {
        if (isUnavailable(res.error)) return null
        throw new Error(res.error.message)
      }
      return new Map((res.data as ProfessionalOffer[]).map((o) => [o.professional_id, o]))
    },
  })
}

export function useSaveOffer() {
  const { session } = useAuth()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (values: OfferValues) => {
      const { professional_id, ...row } = toOfferRow(session!.user.id, values)
      // Update e insert separados: o banco não deixa regravar professional_id.
      const updated = await supabase
        .from('professional_offers')
        .update(row)
        .eq('professional_id', professional_id)
        .select('professional_id')
      if (updated.error) throw new Error(updated.error.message)
      if (updated.data.length === 0) {
        const inserted = await supabase.from('professional_offers').insert({ professional_id, ...row })
        if (inserted.error) throw new Error(inserted.error.message)
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['offers'] }),
  })
}
