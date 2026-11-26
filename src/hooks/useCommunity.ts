// Comunidade: feed com temas, fotos, comentários e curtidas. Quem vê e escreve
// o quê é o banco que decide (RLS); aqui só buscamos e enviamos.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth-context'
import { toPost, type CommunityAuthor, type CommunityPostRow, type CommunityTopic } from '../lib/community'
import { toGalleryJpeg } from '../lib/image'
import { COMMUNITY_BUCKET, supabase } from '../lib/supabase'

/** Posts por página do feed; "Ver posts mais antigos" busca mais uma página. */
export const FEED_PAGE = 50

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function useMe() {
  const { session } = useAuth()
  return session?.user.id
}

async function fetchAuthors(ids: string[]): Promise<Map<string, CommunityAuthor>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase.from('community_authors').select('*').in('id', ids)
  fail(error)
  return new Map(((data ?? []) as CommunityAuthor[]).map((a) => [a.id, a]))
}

/** Feed paginado (de um tema, ou todos), com autor, curtidas e número de comentários. */
export function useFeed(topic: CommunityTopic | null) {
  const me = useMe()
  return useInfiniteQuery({
    queryKey: ['community', 'feed', topic, me],
    enabled: Boolean(me),
    refetchInterval: 30_000,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('community_posts')
        .select('id, author_id, topic, body, photos, created_at, community_likes(user_id), community_comments(count)')
        .order('created_at', { ascending: false })
        .limit(FEED_PAGE)
      if (topic) q = q.eq('topic', topic)
      if (pageParam) q = q.lt('created_at', pageParam)
      const { data, error } = await q
      fail(error)
      const posts = ((data ?? []) as CommunityPostRow[]).map((r) => toPost(r, me!))
      const authors = await fetchAuthors([...new Set(posts.map((p) => p.authorId))])
      return { posts, authors, next: posts.length === FEED_PAGE ? posts[posts.length - 1].createdAt : null }
    },
    getNextPageParam: (last) => last.next,
  })
}

export interface CommunityComment {
  id: string
  author_id: string
  body: string
  created_at: string
}

export function useComments(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['community', 'comments', postId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_comments')
        .select('id, author_id, body, created_at')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
      fail(error)
      const comments = (data ?? []) as CommunityComment[]
      const authors = await fetchAuthors([...new Set(comments.map((c) => c.author_id))])
      return { comments, authors }
    },
  })
}

export function useCreatePost() {
  const me = useMe()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { topic: CommunityTopic; body: string; files: File[] }) => {
      const uploaded: string[] = []
      try {
        for (const [i, file] of input.files.entries()) {
          const blob = await toGalleryJpeg(file)
          const path = `${me}/${Date.now()}-${i}.jpg`
          fail(
            (
              await supabase.storage
                .from(COMMUNITY_BUCKET)
                .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
            ).error,
          )
          uploaded.push(path)
        }
        fail(
          (
            await supabase
              .from('community_posts')
              .insert({ author_id: me, topic: input.topic, body: input.body.trim(), photos: uploaded })
          ).error,
        )
      } catch (e) {
        if (uploaded.length) await supabase.storage.from(COMMUNITY_BUCKET).remove(uploaded) // não deixa arquivo sem uso
        throw e
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', 'feed'] }),
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (post: { id: string; photos: string[] }) => {
      fail((await supabase.from('community_posts').delete().eq('id', post.id)).error)
      if (post.photos.length) await supabase.storage.from(COMMUNITY_BUCKET).remove(post.photos)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community', 'feed'] }),
  })
}

export function useToggleLike() {
  const me = useMe()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) fail((await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', me!)).error)
      else fail((await supabase.from('community_likes').insert({ post_id: postId, user_id: me })).error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['community', 'feed'] }),
  })
}

export function useAddComment(postId: string) {
  const me = useMe()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      fail((await supabase.from('community_comments').insert({ post_id: postId, author_id: me, body: body.trim() })).error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'comments', postId] })
      qc.invalidateQueries({ queryKey: ['community', 'feed'] })
    },
  })
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      fail((await supabase.from('community_comments').delete().eq('id', id)).error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community', 'comments', postId] })
      qc.invalidateQueries({ queryKey: ['community', 'feed'] })
    },
  })
}

export function useReportPost() {
  const me = useMe()
  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('community_reports').insert({ post_id: postId, reporter_id: me })
      if (error && !/duplicate key/i.test(error.message)) throw new Error(error.message)
    },
  })
}
