// Consultas do "Meu plano" (pessoa) e do plano na ficha do paciente
// (profissional). Quem garante quem lê e escreve o quê é o banco (RLS).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import type { PlanCheck, PlanItem, PlanNote, PlanOutcome, ProfileBrief, Share, Specialty } from '../lib/database.types'
import { addDays, today } from '../lib/dates'
import { toGalleryJpeg } from '../lib/image'
import type { toPlanItemRow } from '../lib/plan'
import { PRO_PROFILE, supabase } from '../lib/supabase'

type PlanItemRow = ReturnType<typeof toPlanItemRow>

export type PlanAuthor = { specialty: Specialty; profiles: ProfileBrief }
export type PersonPlanItem = PlanItem & { professionals: PlanAuthor }
type ShareWithAuthor = Share & { professionals: PlanAuthor }

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

function useUserId(): string {
  const { session } = useAuth()
  if (!session) throw new Error('Usuário não autenticado')
  return session.user.id
}

// ------------------------------------------------------------------ pessoa

export type TodayCheck = Pick<PlanCheck, 'outcome' | 'note' | 'photo_path'>

export interface MyPlan {
  items: PersonPlanItem[]
  notes: PlanNote[]
  /** Registros de hoje, por item */
  checksToday: Map<string, TodayCheck>
  /** Todos os compartilhamentos (ativos e encerrados), um por profissional, o mais recente */
  shares: Map<string, ShareWithAuthor>
  painToday: number | null
}

export function useMyPlan() {
  const userId = useUserId()
  const todayIso = today()
  return useQuery({
    queryKey: ['plan', userId, todayIso],
    queryFn: async (): Promise<MyPlan> => {
      const [items, notes, checks, shares, log] = await Promise.all([
        supabase
          .from('plan_items')
          .select(`*, professionals(specialty, ${PRO_PROFILE})`)
          .eq('person_id', userId)
          .order('position'),
        supabase.from('plan_notes').select('*').eq('person_id', userId),
        supabase.from('plan_checks').select('*').eq('person_id', userId).eq('check_date', todayIso),
        supabase
          .from('shares')
          .select(`*, professionals(specialty, ${PRO_PROFILE})`)
          .eq('person_id', userId)
          .order('created_at', { ascending: false }),
        supabase.from('daily_logs').select('pain_level').eq('user_id', userId).eq('log_date', todayIso).maybeSingle(),
      ])
      const byPro = new Map<string, ShareWithAuthor>()
      // Mais recente primeiro: um compartilhamento ativo vence um antigo revogado.
      for (const s of unwrap<ShareWithAuthor[]>(shares)) {
        const prev = byPro.get(s.professional_id)
        if (!prev || (prev.revoked_at && !s.revoked_at)) byPro.set(s.professional_id, s)
      }
      return {
        items: unwrap<PersonPlanItem[]>(items),
        notes: unwrap<PlanNote[]>(notes),
        checksToday: new Map(
          unwrap<(TodayCheck & { item_id: string })[]>(checks).map((c) => [
            c.item_id,
            { outcome: c.outcome, note: c.note, photo_path: c.photo_path ?? null },
          ]),
        ),
        shares: byPro,
        painToday: unwrap<{ pain_level: number | null } | null>(log)?.pain_level ?? null,
      }
    },
  })
}

/** Registra o item de hoje (outcome null apaga o registro). */
export function useSetPlanCheck() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      itemId,
      outcome,
      note = null,
      photoPath,
      removePhoto = null,
    }: {
      itemId: string
      outcome: PlanOutcome | null
      note?: string | null
      /** Foto da refeição. Ausente: mantém a que já estava. */
      photoPath?: string | null
      /** Ao apagar o registro, a foto dele (para não sobrar arquivo sem uso). */
      removePhoto?: string | null
    }) => {
      const date = today()
      if (outcome) {
        unwrap(
          await supabase
            .from('plan_checks')
            .upsert(
              {
                item_id: itemId,
                person_id: userId,
                check_date: date,
                outcome,
                note: note?.trim() || null,
                // Só manda a coluna quando muda: sem a migration de nutrição, o resto continua funcionando.
                ...(photoPath !== undefined ? { photo_path: photoPath } : {}),
              },
              { onConflict: 'item_id,check_date' },
            ),
        )
      } else {
        unwrap(await supabase.from('plan_checks').delete().eq('item_id', itemId).eq('check_date', date))
        if (removePhoto) await supabase.storage.from(MEAL_PHOTO_BUCKET).remove([removePhoto])
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['plan', userId] }),
  })
}

/** Dor de hoje (0 a 10), guardada junto com os outros registros do dia. */
export function useSetPain() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (level: number) =>
      unwrap(
        await supabase
          .from('daily_logs')
          .upsert({ user_id: userId, log_date: today(), pain_level: level }, { onConflict: 'user_id,log_date' }),
      ),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['plan', userId] })
      qc.invalidateQueries({ queryKey: ['daily_logs', userId] })
    },
  })
}

// ------------------------------------------------------------ profissional

export interface PatientPlan {
  items: PlanItem[]
  note: PlanNote | null
  /** Marcações dos últimos 8 dias (para a adesão da semana) */
  checks: Pick<PlanCheck, 'item_id' | 'check_date' | 'outcome' | 'note' | 'photo_path'>[]
}

export function usePatientPlan(personId: string | undefined) {
  const proId = useUserId()
  return useQuery({
    queryKey: ['patient_plan', proId, personId],
    enabled: Boolean(personId),
    queryFn: async (): Promise<PatientPlan> => {
      const [items, note, checks] = await Promise.all([
        supabase.from('plan_items').select('*').eq('professional_id', proId).eq('person_id', personId!).order('position'),
        supabase.from('plan_notes').select('*').eq('professional_id', proId).eq('person_id', personId!).maybeSingle(),
        supabase
          .from('plan_checks')
          .select('*')
          .eq('person_id', personId!)
          .gte('check_date', addDays(today(), -8)),
      ])
      return {
        items: unwrap<PlanItem[]>(items),
        note: unwrap<PlanNote | null>(note),
        checks: unwrap<PatientPlan['checks']>(checks),
      }
    },
  })
}

export function useSavePlanItem(personId: string) {
  const proId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, row, position }: { id?: string; row: PlanItemRow; position: number }) => {
      if (id) unwrap(await supabase.from('plan_items').update(row).eq('id', id))
      else
        unwrap(await supabase.from('plan_items').insert({ ...row, position, professional_id: proId, person_id: personId }))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['patient_plan', proId, personId] }),
  })
}

export function useDeletePlanItem(personId: string) {
  const proId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('plan_items').delete().eq('id', id)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['patient_plan', proId, personId] }),
  })
}

/**
 * Salva o recado geral. Update e insert separados de propósito: o banco só deixa
 * alterar o texto, e um "upsert" tentaria regravar o dono e o paciente.
 * Texto vazio apaga o recado.
 */
export function useSavePlanNote(personId: string) {
  const proId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ note, exists }: { note: string; exists: boolean }) => {
      const text = note.trim()
      const where = { professional_id: proId, person_id: personId }
      if (!text) {
        if (exists) unwrap(await supabase.from('plan_notes').delete().match(where))
      } else if (exists) unwrap(await supabase.from('plan_notes').update({ note: text }).match(where))
      else unwrap(await supabase.from('plan_notes').insert({ ...where, note: text }))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['patient_plan', proId, personId] }),
  })
}

// ------------------------------------------------------------ fotos das refeições

export const MEAL_PHOTO_BUCKET = 'meal-photos'

/** Links temporários (1 h) das fotos das refeições. O bucket é privado: quem pode ver, o banco decide. */
export function useMealPhotoUrls(paths: string[]) {
  const key = [...new Set(paths)].sort()
  return useQuery({
    queryKey: ['meal_photos', key],
    enabled: key.length > 0,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<Map<string, string>> => {
      const { data, error } = await supabase.storage.from(MEAL_PHOTO_BUCKET).createSignedUrls(key, 3600)
      if (error) return new Map()
      const out = new Map<string, string>()
      for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl)
      return out
    },
  })
}

/** Substituições que a pessoa salvou. Vazio se o banco ainda não tiver a tabela. */
export function useMealFavorites() {
  const userId = useUserId()
  return useQuery({
    queryKey: ['meal_favorites', userId],
    queryFn: async (): Promise<{ id: string; label: string }[]> => {
      const { data, error } = await supabase.from('meal_favorites').select('id, label').order('created_at')
      return error ? [] : (data ?? [])
    },
  })
}

export function useAddMealFavorite() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (label: string) => {
      const { error } = await supabase.from('meal_favorites').insert({ label: label.trim() })
      if (error && !/duplicate key/i.test(error.message)) {
        throw new Error(/limite_de_favoritas/.test(error.message) ? 'Você chegou ao limite de 30 favoritas.' : error.message)
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['meal_favorites', userId] }),
  })
}

export function useRemoveMealFavorite() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('meal_favorites').delete().eq('id', id)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['meal_favorites', userId] }),
  })
}

/**
 * Envia a foto da refeição (reduzida no aparelho, sem localização) para
 * <pessoa>/<nutricionista>/<item>-<data>.jpg e guarda no registro do dia.
 */
export function useMealPhoto() {
  const userId = useUserId()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      item,
      outcome,
      note,
      file,
      previous,
    }: {
      item: Pick<PlanItem, 'id' | 'professional_id'>
      outcome: PlanOutcome
      note: string | null
      /** null remove a foto. */
      file: File | null
      previous: string | null
    }) => {
      const date = today()
      let path: string | null = null
      if (file) {
        const blob = await toGalleryJpeg(file)
        // Nome novo a cada envio: o link temporário antigo não mostra a foto errada.
        path = `${userId}/${item.professional_id}/${item.id}-${date}-${Date.now()}.jpg`
        const up = await supabase.storage.from(MEAL_PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
        if (up.error) throw new Error('Não deu para enviar a foto. Tente de novo.')
      }
      const { error } = await supabase
        .from('plan_checks')
        .upsert(
          { item_id: item.id, person_id: userId, check_date: date, outcome, note: note?.trim() || null, photo_path: path },
          { onConflict: 'item_id,check_date' },
        )
      if (error) {
        if (path) await supabase.storage.from(MEAL_PHOTO_BUCKET).remove([path])
        throw new Error(error.message)
      }
      if (previous && previous !== path) await supabase.storage.from(MEAL_PHOTO_BUCKET).remove([previous])
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['plan', userId] }),
  })
}
