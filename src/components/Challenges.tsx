import { Check, Flame, HandHeart, Link2, Plus, Trophy } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/auth-context'
import {
  isChallengesUnavailable,
  useChallenges,
  useCheer,
  useCreateChallenge,
  useJoinChallenge,
  useJoinClub,
  useLeaveChallenge,
  useLeaveClub,
  useSetCheckin,
  type Challenge,
  type Club,
} from '../hooks/useChallenges'
import { useCreatePost } from '../hooks/useCommunity'
import {
  CHALLENGE_RULES,
  GOAL_OPTIONS,
  challengeStatus,
  loggableDays,
  scoreboard,
  weekStart,
  weeklyStreak,
  weeksMetBy,
} from '../lib/challenges'
import type { CommunityAuthor } from '../lib/community'
import { POST_MAX } from '../lib/community'
import { addDays, todayBRT, weekOf, weekdayShort } from '../lib/dates'
import { Avatar } from './Avatar'
import { ErrorState, Modal, Skeleton } from './ui'

function shortDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

function treinos(n: number): string {
  return `${n} ${n === 1 ? 'treino' : 'treinos'}`
}

/** Clube e desafios da semana, no topo da Comunidade. */
export function ChallengesSection({ focusId }: { focusId: string | null }) {
  const { session } = useAuth()
  const me = session?.user.id ?? ''
  const query = useChallenges()
  // O banco conta os dias do desafio no horário de Brasília
  const todayIso = todayBRT()

  if (query.isLoading) return <Skeleton className="h-32" />
  // Banco sem as tabelas de desafios: a Comunidade continua só com o feed.
  if (isChallengesUnavailable(query.error)) return null
  if (query.error) return <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
  const { clubs, challenges, authors } = query.data!
  const focusMissing = focusId !== null && !challenges.some((c) => c.id === focusId)

  return (
    <div className="space-y-3">
      {focusMissing && (
        <p role="status" className="card text-sm text-muted">
          Este convite não está disponível para a sua conta ou o desafio foi apagado.
        </p>
      )}
      {clubs.map((club) => (
        <ClubBlock
          key={club.id}
          club={club}
          challenges={challenges.filter((c) => c.club_id === club.id)}
          authors={authors}
          me={me}
          todayIso={todayIso}
          focusId={focusId}
        />
      ))}
    </div>
  )
}

function ClubBlock({
  club,
  challenges,
  authors,
  me,
  todayIso,
  focusId,
}: {
  club: Club
  challenges: Challenge[]
  authors: Map<string, CommunityAuthor>
  me: string
  todayIso: string
  focusId: string | null
}) {
  const join = useJoinClub()
  const leave = useLeaveClub()
  const [creating, setCreating] = useState(false)
  const member = club.community_club_members.some((m) => m.user_id === me)
  const streak = weeklyStreak(weeksMetBy(me, challenges), todayIso)
  const lastWeek = addDays(weekStart(todayIso), -7)
  const open = challenges
    .filter((c) => challengeStatus(c, todayIso) !== 'encerrado' || c.id === focusId)
    .sort((a, b) => {
      const mine = (c: Challenge) => Number(c.participants.some((p) => p.user_id === me && !p.left_at))
      return mine(b) - mine(a) || a.starts_on.localeCompare(b.starts_on)
    })
  const lastResult = challenges.find(
    (c) => c.starts_on === lastWeek && c.id !== focusId && c.participants.some((p) => p.user_id === me && !p.left_at),
  )
  const lastRow = lastResult && scoreboard(lastResult.participants, lastResult.checkins, [], me, todayIso).find((r) => r.userId === me)

  return (
    <section className="space-y-3" aria-label={`Clube ${club.name}`}>
      <div className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Clube</p>
            <h2 className="text-lg leading-snug font-bold">{club.name}</h2>
            <p className="mt-1 text-sm text-muted">{club.description}</p>
          </div>
          {member ? (
            <button className="btn-outline shrink-0 px-3 py-2" disabled={leave.isPending} onClick={() => leave.mutate(club.id)}>
              Sair
            </button>
          ) : (
            <button className="btn-primary shrink-0 px-3 py-2" disabled={join.isPending} onClick={() => join.mutate(club.id)}>
              Entrar no clube
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>
            {club.community_club_members.length} {club.community_club_members.length === 1 ? 'participante' : 'participantes'}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <Flame className="h-4 w-4 text-gold" aria-hidden="true" />
            Sequência: {streak} {streak === 1 ? 'semana' : 'semanas'}
          </span>
          {lastRow && (
            <span>
              Semana passada: {lastRow.done} de {lastRow.goal}
              {lastRow.met ? ' · meta cumprida' : ''}
            </span>
          )}
        </div>
        {(join.error || leave.error) && (
          <p role="alert" className="text-sm text-attention">
            {(join.error ?? leave.error)!.message}
          </p>
        )}
        {member && (
          <button className="btn-outline w-full py-2" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Criar desafio da semana
          </button>
        )}
      </div>

      {open.length === 0 && (
        <p className="card text-center text-sm text-muted">
          Nenhum desafio aberto nesta semana.{member ? ' Crie o primeiro e convide alguém.' : ' Entre no clube para criar um.'}
        </p>
      )}
      {open.map((c) => (
        <ChallengeCard key={c.id} challenge={c} authors={authors} me={me} todayIso={todayIso} focused={c.id === focusId} />
      ))}

      <CreateChallengeModal open={creating} onClose={() => setCreating(false)} clubId={club.id} todayIso={todayIso} />
    </section>
  )
}

function ChallengeCard({
  challenge,
  authors,
  me,
  todayIso,
  focused,
}: {
  challenge: Challenge
  authors: Map<string, CommunityAuthor>
  me: string
  todayIso: string
  focused: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const join = useJoinChallenge()
  const leave = useLeaveChallenge()
  const setCheckin = useSetCheckin()
  const cheer = useCheer()
  const [goal, setGoal] = useState(3)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const status = challengeStatus(challenge, todayIso)
  const rows = scoreboard(challenge.participants, challenge.checkins, challenge.cheers, me, todayIso)
  const mine = rows.find((r) => r.userId === me)
  const left = challenge.participants.some((p) => p.user_id === me && p.left_at)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const canLog = new Set(loggableDays(challenge, todayIso))
  const error = join.error ?? leave.error ?? setCheckin.error ?? cheer.error

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [focused])

  async function invite() {
    const url = `${window.location.origin}/convite/${challenge.id}`
    try {
      if (navigator.share) await navigator.share({ title: 'Skyro', text: `Entra comigo no desafio "${challenge.title}"`, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
      }
    } catch {
      // a pessoa fechou o compartilhamento
    }
  }

  return (
    <article
      ref={ref}
      id={`desafio-${challenge.id}`}
      className={`card space-y-3 ${focused ? 'border-lavender' : ''}`}
      aria-label={`Desafio ${challenge.title}`}
    >
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chip">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="leading-snug font-semibold">{challenge.title}</h3>
          <p className="text-xs text-muted">
            {shortDate(challenge.starts_on)} a {shortDate(challenge.ends_on)} ·{' '}
            {status === 'ativo' ? 'esta semana' : status === 'proximo' ? 'começa na segunda' : 'encerrado'} ·{' '}
            {rows.length} {rows.length === 1 ? 'pessoa' : 'pessoas'}
          </p>
        </div>
      </header>

      {mine ? (
        <div className="space-y-3">
          <div>
            <p className="text-2xl font-bold" aria-live="polite">
              {mine.done} de {mine.goal}
              <span className="ml-2 text-sm font-medium text-muted">{mine.goal === 1 ? 'treino' : 'treinos'} na semana</span>
            </p>
            <div className="mt-2 h-2 rounded-full bg-chip" aria-hidden="true">
              <div
                className="h-2 rounded-full bg-lavender transition-all"
                style={{ width: `${Math.min(100, Math.round((mine.done / mine.goal) * 100))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Treinos da semana">
            {weekOf(challenge.starts_on).map((d) => {
              const done = mine.days.has(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={done}
                  aria-label={`${weekdayShort(d)} ${shortDate(d)}: ${done ? 'treino registrado' : 'sem treino'}`}
                  disabled={!canLog.has(d) || setCheckin.isPending}
                  onClick={() => setCheckin.mutate({ challengeId: challenge.id, date: d, done: !done })}
                  className={`flex min-h-11 flex-col items-center justify-center rounded-lg border text-[11px] font-semibold transition disabled:opacity-40 ${
                    done ? 'border-lavender bg-lavender text-black' : 'border-line bg-card text-muted hover:border-ink/40'
                  } ${d === todayIso ? 'ring-1 ring-ink/40' : ''}`}
                >
                  {weekdayShort(d)}
                  {done && <Check className="h-3 w-3" aria-hidden="true" />}
                </button>
              )
            })}
          </div>

          {mine.met ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-chip px-3 py-2 text-sm">
              <span className="font-semibold">Meta cumprida! +1 ponto nesta rodada.</span>
              <button className="btn-outline px-3 py-1.5" onClick={() => setSharing(true)}>
                Compartilhar conquista
              </button>
            </div>
          ) : status === 'ativo' && !mine.days.has(todayIso) ? (
            <div className="space-y-1.5">
              <button
                className="btn-primary w-full"
                disabled={setCheckin.isPending}
                onClick={() => setCheckin.mutate({ challengeId: challenge.id, date: todayIso, done: true })}
              >
                Registrar treino de hoje
              </button>
              <p className="text-xs text-muted">
                Perdeu um dia? Remarque: toque em outro dia da semana quando treinar. O que vale é fechar a meta.
              </p>
            </div>
          ) : status === 'ativo' ? (
            <p className="text-sm text-muted">
              Treino de hoje registrado. Faltam {treinos(mine.goal - mine.done)} para fechar a meta.
            </p>
          ) : null}
        </div>
      ) : left ? (
        <p className="text-sm text-muted">Você saiu desta rodada. Dá para entrar de novo no próximo desafio.</p>
      ) : status !== 'encerrado' ? (
        <div className="space-y-3">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {CHALLENGE_RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-semibold" htmlFor={`meta-${challenge.id}`}>
              Minha meta
            </label>
            <select
              id={`meta-${challenge.id}`}
              className="input w-auto py-2"
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
            >
              {GOAL_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {treinos(g)} na semana
                </option>
              ))}
            </select>
            <button
              className="btn-primary ml-auto px-4 py-2"
              disabled={join.isPending}
              onClick={() => join.mutate({ challengeId: challenge.id, goal })}
            >
              Entrar no desafio
            </button>
          </div>
        </div>
      ) : null}

      {rows.length > 0 && (
        <ul className="space-y-2 border-t border-line pt-3" aria-label="Placar">
          {rows.map((r) => {
            const a = authors.get(r.userId)
            const name = r.userId === me ? 'Você' : (a?.full_name ?? 'Participante')
            return (
              <li key={r.userId} className="flex items-center gap-2.5 text-sm">
                <Avatar seed={a?.avatar_seed} photo={a?.avatar_path} name={a?.full_name ?? '?'} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {name}
                    {r.met && <Check className="ml-1 inline h-4 w-4 text-lavender" aria-label="meta cumprida" />}
                  </p>
                  <p className="text-xs text-muted">
                    {r.done} de {r.goal}
                    {r.cheersToday > 0 && ` · ${r.cheersToday} ${r.cheersToday === 1 ? 'incentivo' : 'incentivos'} hoje`}
                  </p>
                </div>
                {mine && r.userId !== me && status === 'ativo' && (
                  <button
                    className="btn-outline shrink-0 px-3 py-1.5"
                    disabled={r.cheeredByMeToday || cheer.isPending}
                    onClick={() => cheer.mutate({ challengeId: challenge.id, toUser: r.userId })}
                  >
                    <HandHeart className="h-4 w-4" aria-hidden="true" />
                    {r.cheeredByMeToday ? 'Incentivado' : 'Incentivar'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-attention">
          {error.message}
        </p>
      )}

      {status !== 'encerrado' && (
        <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-2 text-sm">
          <button className="tap gap-1.5 rounded-lg px-2 font-semibold hover:bg-chip" onClick={invite}>
            <Link2 className="h-4 w-4" aria-hidden="true" /> {copied ? 'Link copiado' : 'Convidar'}
          </button>
          {mine && (
            <button
              className="tap ml-auto rounded-lg px-2 font-semibold text-muted hover:bg-chip"
              onClick={() => setConfirmLeave(true)}
            >
              Sair do desafio
            </button>
          )}
        </footer>
      )}

      <Modal open={confirmLeave} onClose={() => setConfirmLeave(false)} title="Sair do desafio?">
        <p className="text-sm text-muted">
          Seus treinos desta rodada são apagados e você não volta nela, porque a meta é fixa. No próximo desafio dá para
          entrar de novo.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn-outline px-4 py-2" onClick={() => setConfirmLeave(false)}>
            Ficar
          </button>
          <button
            className="btn-primary px-4 py-2"
            disabled={leave.isPending}
            onClick={() => leave.mutate(challenge.id, { onSettled: () => setConfirmLeave(false) })}
          >
            Sair
          </button>
        </div>
      </Modal>

      {/* Só existe enquanto aberto: o texto sugerido usa a contagem de treinos do momento */}
      {mine && sharing && (
        <ShareModal
          open={sharing}
          onClose={() => setSharing(false)}
          defaultText={`Fechei minha meta da semana: ${treinos(mine.done)} no desafio "${challenge.title}".`}
        />
      )}
    </article>
  )
}

/** Cartão editável: a conquista só vai para o feed se a pessoa publicar. */
function ShareModal({ open, onClose, defaultText }: { open: boolean; onClose: () => void; defaultText: string }) {
  const create = useCreatePost()
  const [text, setText] = useState(defaultText)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    create.mutate({ topic: 'treino', body: text, files: [] }, { onSuccess: onClose })
  }

  return (
    <Modal open={open} onClose={onClose} title="Compartilhar conquista">
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-muted">Edite o texto como quiser. Só aparece na Comunidade se você publicar.</p>
        <textarea
          className="input min-h-24 resize-y"
          maxLength={POST_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Texto da conquista"
        />
        {create.error && (
          <p role="alert" className="text-sm text-attention">
            {create.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline px-4 py-2" onClick={onClose}>
            Agora não
          </button>
          <button type="submit" className="btn-primary px-4 py-2" disabled={!text.trim() || create.isPending}>
            Publicar
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CreateChallengeModal({
  open,
  onClose,
  clubId,
  todayIso,
}: {
  open: boolean
  onClose: () => void
  clubId: string
  todayIso: string
}) {
  const create = useCreateChallenge()
  const thisWeek = weekStart(todayIso)
  const [goal, setGoal] = useState(3)
  const [title, setTitle] = useState('')
  const [startsOn, setStartsOn] = useState(thisWeek)
  const [announce, setAnnounce] = useState(true)
  const suggested = `Vou treinar ${goal} ${goal === 1 ? 'vez' : 'vezes'} ${startsOn === thisWeek ? 'nesta semana' : 'na próxima semana'}`

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate(
      { clubId, title: title.trim() || suggested, goal, startsOn, announce },
      {
        onSuccess: () => {
          setTitle('')
          onClose()
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo desafio">
      <form onSubmit={submit} className="space-y-3">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          {CHALLENGE_RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <label className="block space-y-1 text-sm font-semibold">
          Minha meta
          <select className="input" value={goal} onChange={(e) => setGoal(Number(e.target.value))}>
            {GOAL_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {treinos(g)} na semana
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm font-semibold">
          Semana
          <select className="input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)}>
            <option value={thisWeek}>
              Esta semana ({shortDate(thisWeek)} a {shortDate(addDays(thisWeek, 6))})
            </option>
            <option value={addDays(thisWeek, 7)}>
              Próxima semana ({shortDate(addDays(thisWeek, 7))} a {shortDate(addDays(thisWeek, 13))})
            </option>
          </select>
        </label>
        <label className="block space-y-1 text-sm font-semibold">
          Nome do desafio
          <input
            className="input"
            maxLength={80}
            placeholder={suggested}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
          Publicar no feed para chamar mais gente
        </label>
        {create.error && (
          <p role="alert" className="text-sm text-attention">
            {create.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline px-4 py-2" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary px-4 py-2" disabled={create.isPending}>
            Criar desafio
          </button>
        </div>
      </form>
    </Modal>
  )
}
