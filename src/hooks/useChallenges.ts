// Clubes e desafios da Comunidade. As regras (quem vê, meta fixa, um treino por
// dia, só dentro da semana) são do banco; aqui só buscamos e enviamos.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import type { ChallengeCheckin, ChallengeCheer, ChallengeParticipant } from '../lib/challenges'
import { addDays, today } from '../lib/dates'
import { supabase } from '../lib/supabase'
import { fetchAuthors } from './useCommunity'

/** Semanas de histórico usadas para a sequência. */
const HISTORY_WEEKS = 26

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function useMe() {
  const { session } = useAuth()
  return session?.user.id
}

export interface Club {
  id: string
  name: string
  description: string
  community_club_members: { user_id: string }[]
}

export interface Challenge {
  id: string
  club_id: string
  created_by: string
  title: string
  starts_on: string
  ends_on: string
  participants: ChallengeParticipant[]
  checkins: ChallengeCheckin[]
  cheers: ChallengeCheer[]
  /** Posts do feed que anunciam este desafio */
  postIds: string[]
}

interface ChallengeRow extends Omit<Challenge, 'participants' | 'checkins' | 'cheers' | 'postIds'> {
  challenge_participants: ChallengeParticipant[]
  challenge_checkins: ChallengeCheckin[]
  challenge_cheers: ChallengeCheer[]
  community_posts: { id: string }[]
}

/** O banco ainda não tem as tabelas de desafios (migration não aplicada)? */
export function isChallengesUnavailable(error: { message: string } | null | undefined): boolean {
  return Boolean(error && /schema cache|does not exist|could not find/i.test(error.message))
}

export function useChallenges() {
  const me = useMe()
  return useQuery({
    queryKey: ['community', 'challenges', me],
    enabled: Boolean(me),
    refetchInterval: 30_000,
    retry: (count, error) => !isChallengesUnavailable(error) && count < 1,
    queryFn: async () => {
      const [clubsRes, challengesRes] = await Promise.all([
        supabase.from('community_clubs').select('id, name, description, community_club_members(user_id)').order('created_at'),
        supabase
          .from('challenges')
          .select(
            'id, club_id, created_by, title, starts_on, ends_on, challenge_participants(user_id, weekly_goal), challenge_checkins(user_id, activity_date), challenge_cheers(from_user, to_user, cheer_date), community_posts(id)',
          )
          .gte('ends_on', addDays(today(), -7 * HISTORY_WEEKS))
          .order('starts_on', { ascending: false })
          .limit(300),
      ])
      fail(clubsRes.error)
      fail(challengesRes.error)
      const challenges: Challenge[] = ((challengesRes.data ?? []) as ChallengeRow[]).map((r) => ({
        id: r.id,
        club_id: r.club_id,
        created_by: r.created_by,
        title: r.title,
        starts_on: r.starts_on,
        ends_on: r.ends_on,
        participants: r.challenge_participants,
        checkins: r.challenge_checkins,
        cheers: r.challenge_cheers,
        postIds: r.community_posts.map((p) => p.id),
      }))
      const ids = new Set(challenges.flatMap((c) => c.participants.map((p) => p.user_id)))
      const authors = await fetchAuthors([...ids])
      return { clubs: (clubsRes.data ?? []) as Club[], challenges, authors }
    },
  })
}

function useChallengeMutation<T>(fn: (input: T, me: string) => Promise<void>, alsoFeed = false) {
  const me = useMe()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: T) => fn(input, me!),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['community', 'challenges'] })
      if (alsoFeed) qc.invalidateQueries({ queryKey: ['community', 'feed'] })
    },
  })
}

export function useJoinClub() {
  return useChallengeMutation<string>(async (clubId, me) => {
    fail((await supabase.from('community_club_members').insert({ club_id: clubId, user_id: me })).error)
  })
}

export function useLeaveClub() {
  return useChallengeMutation<string>(async (clubId, me) => {
    fail((await supabase.from('community_club_members').delete().eq('club_id', clubId).eq('user_id', me)).error)
  })
}

export function useCreateChallenge() {
  return useChallengeMutation<{ clubId: string; title: string; goal: number; startsOn: string; announce: boolean }>(
    async (input, me) => {
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          club_id: input.clubId,
          created_by: me,
          title: input.title.trim(),
          starts_on: input.startsOn,
          ends_on: addDays(input.startsOn, 6),
        })
        .select('id')
        .single()
      fail(error)
      const id = (data as { id: string }).id
      fail(
        (await supabase.from('challenge_participants').insert({ challenge_id: id, user_id: me, weekly_goal: input.goal }))
          .error,
      )
      if (input.announce) {
        fail(
          (
            await supabase.from('community_posts').insert({
              author_id: me,
              topic: 'treino',
              body: `${input.title.trim()}. Quem topa entrar comigo no desafio?`,
              challenge_id: id,
            })
          ).error,
        )
      }
    },
    true,
  )
}

export function useJoinChallenge() {
  return useChallengeMutation<{ challengeId: string; goal: number }>(async ({ challengeId, goal }, me) => {
    fail(
      (await supabase.from('challenge_participants').insert({ challenge_id: challengeId, user_id: me, weekly_goal: goal }))
        .error,
    )
  })
}

export function useLeaveChallenge() {
  return useChallengeMutation<string>(async (challengeId, me) => {
    fail((await supabase.from('challenge_checkins').delete().eq('challenge_id', challengeId).eq('user_id', me)).error)
    fail((await supabase.from('challenge_participants').delete().eq('challenge_id', challengeId).eq('user_id', me)).error)
  })
}

/** Marca ou desmarca o treino de um dia da semana do desafio. */
export function useSetCheckin() {
  return useChallengeMutation<{ challengeId: string; date: string; done: boolean }>(
    async ({ challengeId, date, done }, me) => {
      const table = supabase.from('challenge_checkins')
      if (done) fail((await table.insert({ challenge_id: challengeId, user_id: me, activity_date: date })).error)
      else fail((await table.delete().eq('challenge_id', challengeId).eq('user_id', me).eq('activity_date', date)).error)
    },
  )
}

export function useCheer() {
  return useChallengeMutation<{ challengeId: string; toUser: string }>(async ({ challengeId, toUser }, me) => {
    const { error } = await supabase
      .from('challenge_cheers')
      .insert({ challenge_id: challengeId, from_user: me, to_user: toUser })
    if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message)
  })
}
