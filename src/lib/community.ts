import type { Specialty } from './database.types'

export type CommunityTopic = 'geral' | 'nutricao' | 'treino' | 'mente' | 'fisio'

export const TOPICS: { value: CommunityTopic; label: string }[] = [
  { value: 'geral', label: 'Geral' },
  { value: 'nutricao', label: 'Nutrição' },
  { value: 'treino', label: 'Treino' },
  { value: 'mente', label: 'Mente' },
  { value: 'fisio', label: 'Fisio' },
]

export function topicLabel(t: CommunityTopic): string {
  return TOPICS.find((x) => x.value === t)?.label ?? t
}

export const POST_MAX = 2000
export const COMMENT_MAX = 1000
export const PHOTOS_MAX = 4

export interface CommunityAuthor {
  id: string
  full_name: string
  avatar_seed: string | null
  avatar_path: string | null
  role: 'person' | 'professional' | 'admin'
  specialty: Specialty | null
  verified: boolean
}

export interface CommunityPostRow {
  id: string
  author_id: string
  topic: CommunityTopic
  body: string
  photos: string[]
  created_at: string
  community_likes: { user_id: string }[]
  community_comments: { count: number }[]
}

export interface CommunityPost {
  id: string
  authorId: string
  topic: CommunityTopic
  body: string
  photos: string[]
  createdAt: string
  likes: number
  likedByMe: boolean
  comments: number
}

export function toPost(row: CommunityPostRow, me: string): CommunityPost {
  return {
    id: row.id,
    authorId: row.author_id,
    topic: row.topic,
    body: row.body,
    photos: row.photos ?? [],
    createdAt: row.created_at,
    likes: row.community_likes.length,
    likedByMe: row.community_likes.some((l) => l.user_id === me),
    comments: row.community_comments[0]?.count ?? 0,
  }
}

/** "agora", "há 5 min", "há 3 h", "há 2 dias" ou a data (dd/mm) depois de uma semana. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime())
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
