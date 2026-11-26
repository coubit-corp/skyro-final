import { BadgeCheck, Flag, Heart, ImagePlus, MessageCircle, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/auth-context'
import { Avatar } from '../components/Avatar'
import { DemoBanner } from '../components/DemoBanner'
import { ChipTabs, ErrorState, Modal, PageHeader, Skeleton } from '../components/ui'
import {
  useAddComment,
  useComments,
  useCreatePost,
  useDeleteComment,
  useDeletePost,
  useFeed,
  useReportPost,
  useToggleLike,
} from '../hooks/useCommunity'
import {
  COMMENT_MAX,
  PHOTOS_MAX,
  POST_MAX,
  TOPICS,
  timeAgo,
  topicLabel,
  type CommunityAuthor,
  type CommunityPost,
  type CommunityTopic,
} from '../lib/community'
import { specialtyLabel } from '../lib/specialties'
import { communityUrl } from '../lib/supabase'


/** Feed da Comunidade: pessoas e profissionais trocam dicas, fotos e incentivo. */
export function Comunidade() {
  // "Geral" mostra o feed inteiro; os outros temas filtram.
  const [filter, setFilter] = useState<CommunityTopic>('geral')
  const feed = useFeed(filter === 'geral' ? null : filter)
  const posts = feed.data?.pages.flatMap((pg) => pg.posts) ?? []
  const authors = new Map(feed.data?.pages.flatMap((pg) => [...pg.authors]) ?? [])

  return (
    <section className="space-y-4">
      <PageHeader title="Comunidade" subtitle="Troque experiências, dicas e conquistas com pessoas e profissionais." />
      <Composer defaultTopic={filter} />
      <ChipTabs options={TOPICS} value={filter} onChange={setFilter} label="Filtrar por tema" />

      {feed.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : feed.error ? (
        <ErrorState message={feed.error.message} onRetry={() => feed.refetch()} />
      ) : posts.length === 0 ? (
        <div className="card text-center text-sm text-muted">
          Ainda não tem nada {filter === 'geral' ? 'por aqui' : `em ${topicLabel(filter)}`}. Que tal começar a conversa?
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id}>
              <PostCard post={p} author={authors.get(p.authorId)} />
            </li>
          ))}
        </ul>
      )}
      {feed.hasNextPage && (
        <button className="btn-outline w-full" disabled={feed.isFetchingNextPage} onClick={() => feed.fetchNextPage()}>
          {feed.isFetchingNextPage ? 'Carregando…' : 'Ver posts mais antigos'}
        </button>
      )}
      <p className="text-xs text-muted">
        Dicas da comunidade não substituem a orientação do seu profissional. Em caso de urgência, ligue 192 (SAMU).
      </p>
      <DemoBanner />
    </section>
  )
}

function AuthorLine({ author, createdAt, extra }: { author?: CommunityAuthor; createdAt: string; extra?: string }) {
  const name = author?.full_name ?? 'Alguém da comunidade'
  const isPro = author?.role === 'professional'
  return (
    <div className="min-w-0 flex-1">
      <p className="flex flex-wrap items-center gap-x-1.5 text-sm font-semibold">
        <span className="truncate">{name}</span>
        {isPro && (
          <span className="inline-flex items-center gap-0.5 rounded-md bg-chip px-1.5 py-0.5 text-[11px] font-semibold text-ink">
            {author?.verified && <BadgeCheck className="h-3 w-3 text-lavender" aria-hidden="true" />}
            {author?.specialty ? specialtyLabel(author.specialty) : 'Profissional'}
          </span>
        )}
      </p>
      <p className="text-xs text-muted">
        {timeAgo(createdAt)}
        {extra && ` · ${extra}`}
      </p>
    </div>
  )
}

function Composer({ defaultTopic }: { defaultTopic: CommunityTopic }) {
  const { profile } = useAuth()
  const create = useCreatePost()
  const [body, setBody] = useState('')
  // Segue o filtro aberto até a pessoa escolher outro tema
  const [picked, setPicked] = useState<CommunityTopic | null>(null)
  const topic = picked ?? defaultTopic
  const [files, setFiles] = useState<File[]>([])
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])
  const canPhoto = !profile?.is_demo

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles((cur) => [...cur, ...Array.from(list).filter((f) => f.type.startsWith('image/'))].slice(0, PHOTOS_MAX))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    create.mutate(
      { topic, body, files },
      {
        onSuccess: () => {
          setBody('')
          setFiles([])
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="card space-y-3" aria-label="Novo post">
      <div className="flex items-start gap-3">
        <Avatar seed={profile?.avatar_seed} photo={profile?.avatar_path} name={profile?.full_name || 'Você'} size={40} />
        <textarea
          className="input min-h-20 flex-1 resize-y"
          placeholder="Compartilhe uma dica, uma conquista ou uma dúvida…"
          maxLength={POST_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Texto do post"
        />
      </div>

      {previews.length > 0 && (
        <ul className="grid grid-cols-4 gap-2">
          {previews.map((src, i) => (
            <li key={src} className="relative">
              <img src={src} alt={`Foto ${i + 1} do novo post`} className="aspect-square w-full rounded-lg object-cover" />
              <button
                type="button"
                className="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
                aria-label={`Remover foto ${i + 1}`}
                onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="input w-auto py-2"
          value={topic}
          onChange={(e) => setPicked(e.target.value as CommunityTopic)}
          aria-label="Tema do post"
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {canPhoto && (
          <label
            className={`btn-outline cursor-pointer px-3 py-2 ${files.length >= PHOTOS_MAX ? 'pointer-events-none opacity-50' : ''}`}
          >
            <ImagePlus className="h-4 w-4" aria-hidden="true" /> Fotos
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={files.length >= PHOTOS_MAX}
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
        )}
        <button type="submit" className="btn-primary ml-auto px-4 py-2" disabled={!body.trim() || create.isPending}>
          {create.isPending ? 'Publicando…' : 'Publicar'}
        </button>
      </div>
      {!canPhoto && <p className="text-xs text-muted">Contas de demonstração publicam só texto.</p>}
      {create.error && (
        <p role="alert" className="text-sm text-attention">
          {create.error.message}
        </p>
      )}
    </form>
  )
}

function PostCard({ post, author }: { post: CommunityPost; author?: CommunityAuthor }) {
  const { session } = useAuth()
  const me = session?.user.id
  const mine = post.authorId === me
  const like = useToggleLike()
  const remove = useDeletePost()
  const report = useReportPost()
  const [showComments, setShowComments] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [photo, setPhoto] = useState<string | null>(null)

  return (
    <article className="card space-y-3">
      <header className="flex items-start gap-3">
        <Avatar seed={author?.avatar_seed} photo={author?.avatar_path} name={author?.full_name ?? '?'} size={40} />
        <AuthorLine author={author} createdAt={post.createdAt} extra={topicLabel(post.topic)} />
        {mine ? (
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-chip hover:text-ink"
            aria-label="Apagar post"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-chip hover:text-ink disabled:opacity-50"
            aria-label={report.isSuccess ? 'Post denunciado' : 'Denunciar post'}
            title={report.isSuccess ? 'Denúncia enviada para a Equipe Skyro' : 'Denunciar'}
            disabled={report.isPending || report.isSuccess}
            onClick={() => report.mutate(post.id)}
          >
            <Flag className={`h-4 w-4 ${report.isSuccess ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
        )}
      </header>

      <p className="text-[15px] leading-relaxed whitespace-pre-line">{post.body}</p>

      {post.photos.length > 0 && (
        <div className={`grid gap-2 ${post.photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {post.photos.map((path, i) => (
            <button key={path} type="button" onClick={() => setPhoto(path)} aria-label={`Ampliar foto ${i + 1}`}>
              <img
                src={communityUrl(path)}
                alt={`Foto ${i + 1} do post`}
                loading="lazy"
                className={`w-full rounded-lg bg-chip object-cover ${post.photos.length === 1 ? 'max-h-96' : 'aspect-square'}`}
              />
            </button>
          ))}
        </div>
      )}

      {report.isSuccess && <p className="text-xs text-muted">Obrigado. A Equipe Skyro vai analisar este post.</p>}

      <footer className="flex items-center gap-1 border-t border-line pt-2 text-sm">
        <button
          className={`tap gap-1.5 rounded-lg px-2 font-semibold transition hover:bg-chip ${post.likedByMe ? 'text-ink' : 'text-muted'}`}
          aria-pressed={post.likedByMe}
          disabled={like.isPending}
          onClick={() => like.mutate({ postId: post.id, liked: post.likedByMe })}
        >
          <Heart className={`h-4 w-4 ${post.likedByMe ? 'fill-lavender text-lavender' : ''}`} aria-hidden="true" />
          {post.likes > 0 ? post.likes : ''} Curtir
        </button>
        <button
          className="tap gap-1.5 rounded-lg px-2 font-semibold text-muted transition hover:bg-chip"
          aria-expanded={showComments}
          onClick={() => setShowComments((v) => !v)}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {post.comments > 0 ? post.comments : ''} Comentar
        </button>
      </footer>

      {showComments && <Comments postId={post.id} />}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Apagar post?">
        <p className="text-sm text-muted">O post, as fotos, os comentários e as curtidas somem para todos.</p>
        {remove.error && <p className="text-sm text-attention">{remove.error.message}</p>}
        <div className="flex justify-end gap-2">
          <button className="btn-outline px-4 py-2" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </button>
          <button
            className="btn-primary px-4 py-2"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ id: post.id, photos: post.photos }, { onSuccess: () => setConfirmDelete(false) })}
          >
            Apagar
          </button>
        </div>
      </Modal>

      <Modal open={photo !== null} onClose={() => setPhoto(null)} title="Foto" wide>
        {photo && <img src={communityUrl(photo)} alt="Foto do post ampliada" className="max-h-[75vh] w-full rounded-lg object-contain" />}
        <div className="flex justify-end">
          <button className="btn-outline px-4 py-2" onClick={() => setPhoto(null)}>
            Fechar
          </button>
        </div>
      </Modal>
    </article>
  )
}

function Comments({ postId }: { postId: string }) {
  const { session } = useAuth()
  const me = session?.user.id
  const list = useComments(postId, true)
  const add = useAddComment(postId)
  const remove = useDeleteComment(postId)
  const [body, setBody] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    add.mutate(body, { onSuccess: () => setBody('') })
  }

  return (
    <div className="space-y-3">
      {list.isLoading ? (
        <Skeleton className="h-12" />
      ) : list.error ? (
        <ErrorState message={list.error.message} onRetry={() => list.refetch()} />
      ) : (
        <ul className="space-y-3">
          {list.data!.comments.map((c) => {
            const author = list.data!.authors.get(c.author_id)
            return (
              <li key={c.id} className="flex items-start gap-2.5">
                <Avatar seed={author?.avatar_seed} photo={author?.avatar_path} name={author?.full_name ?? '?'} size={32} />
                <div className="min-w-0 flex-1 rounded-lg bg-chip px-3 py-2">
                  <AuthorLine author={author} createdAt={c.created_at} />
                  <p className="mt-1 text-sm whitespace-pre-line">{c.body}</p>
                </div>
                {c.author_id === me && (
                  <button
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-chip hover:text-ink"
                    aria-label="Apagar comentário"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(c.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="input py-2"
          placeholder="Escreva um comentário…"
          maxLength={COMMENT_MAX}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Comentário"
        />
        <button type="submit" className="btn-primary shrink-0 px-4 py-2" disabled={!body.trim() || add.isPending}>
          Enviar
        </button>
      </form>
      {add.error && (
        <p role="alert" className="text-sm text-attention">
          {add.error.message}
        </p>
      )}
    </div>
  )
}
