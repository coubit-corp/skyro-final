import { Check, Plus, Timer, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { ExercisePicker } from '../../components/ExercisePicker'
import { useSaveWorkout, useWorkoutHistory } from '../../hooks/useWorkouts'
import {
  activeExercise,
  durationLabel,
  finishWorkout,
  formatKg,
  MAX_ROUTINE_EXERCISES,
  MAX_SETS,
  muscleLabel,
  previousSets,
  readDraft,
  recentExercises,
  REST_OPTIONS,
  restLabel,
  setLabel,
  toggleSet,
  workoutTotals,
  writeDraft,
  type ActiveExercise,
  type ActiveSet,
  type ActiveWorkout,
} from '../../lib/workouts'

/** Treino em andamento: registra cada série e salva na história ao concluir. */
export function TreinoAtivo() {
  const me = useAuth().session?.user.id
  const navigate = useNavigate()
  const history = useWorkoutHistory()
  const save = useSaveWorkout()
  const [workout, setWorkout] = useState<ActiveWorkout | null>(() => (me ? readDraft(me) : null))
  const [now, setNow] = useState(() => Date.now())
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const recent = useMemo(() => recentExercises(history.data ?? []), [history.data])

  if (!me || !workout) {
    return (
      <section className="card space-y-3 text-sm">
        <p className="font-semibold">Nenhum treino em andamento.</p>
        <Link to="/plano" className="btn-outline w-full sm:w-auto">
          Voltar para o plano
        </Link>
      </section>
    )
  }

  // Enquanto envia (e depois de enviar), o que foi salvo é o que está na tela: nada mais muda.
  const locked = save.isPending || save.isSuccess
  const update = (next: ActiveWorkout) => {
    if (locked) return
    setWorkout(next)
    writeDraft(me, next)
    setError(null)
  }
  const patchExercise = (i: number, fn: (e: ActiveExercise) => ActiveExercise) =>
    update({ ...workout, exercises: workout.exercises.map((e, j) => (j === i ? fn(e) : e)) })
  const patchSet = (i: number, k: number, fn: (s: ActiveSet) => ActiveSet) =>
    patchExercise(i, (e) => ({ ...e, sets: e.sets.map((s, n) => (n === k ? fn(s) : s)) }))

  const totals = workoutTotals(workout)
  const restLeft = restEndsAt ? Math.ceil((restEndsAt - now) / 1000) : 0

  const conclude = () => {
    const done = finishWorkout(workout, Date.now())
    if (typeof done === 'string') return setError(done)
    save.mutate(done, { onSuccess: () => navigate('/progresso') })
  }

  return (
    <section className="space-y-4 pb-24">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Treino</p>
          <h1 className="truncate text-xl font-bold">{workout.title}</h1>
        </div>
        <button type="button" className="btn-primary shrink-0 px-5" disabled={locked} onClick={conclude}>
          {save.isPending ? 'Salvando…' : 'Concluir'}
        </button>
      </header>

      <dl className="card grid grid-cols-3 gap-2 text-center">
        <Stat label="Duração" value={durationLabel((now - workout.startedAt) / 1000)} />
        <Stat label="Volume" value={`${formatKg(Math.round(totals.volumeKg))} kg`} />
        <Stat label="Séries" value={String(totals.sets)} />
      </dl>

      {(error || save.error) && (
        <p className="text-sm text-attention" role="alert">
          {error ?? save.error?.message}
        </p>
      )}

      <fieldset disabled={locked} className="min-w-0 space-y-4">
      {workout.exercises.length === 0 && (
        <p className="card text-sm text-muted">Adicione o primeiro exercício para começar a registrar.</p>
      )}

      {workout.exercises.map((e, i) => {
        const previous = previousSets(history.data ?? [], e.name)
        return (
          <article key={i} className="card space-y-3" aria-label={e.name}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link to={`/plano/exercicio/${encodeURIComponent(e.name)}`} className="font-semibold break-words underline-offset-2 hover:underline">
                  {e.name}
                </Link>
                <p className="text-xs text-muted">
                  {muscleLabel(e.muscle)}
                  {e.target && ` · meta ${e.target} reps`}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remover ${e.name}`}
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-chip hover:text-ink"
                onClick={() => update({ ...workout, exercises: workout.exercises.filter((_, j) => j !== i) })}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 rounded-full bg-chip px-3 text-sm">
                <Timer className="h-4 w-4 text-muted" aria-hidden="true" />
                <span className="sr-only">Descanso de {e.name}</span>
                <select
                  className="min-h-10 bg-transparent font-semibold"
                  value={e.restSec}
                  onChange={(ev) => patchExercise(i, (x) => ({ ...x, restSec: Number(ev.target.value) }))}
                >
                  {[...new Set([...REST_OPTIONS, e.restSec])].sort((a, b) => a - b).map((s) => (
                    <option key={s} value={s}>
                      Descanso: {restLabel(s)}
                    </option>
                  ))}
                </select>
              </label>
              <input
                className="input py-2 text-sm"
                placeholder="Nota (opcional)"
                aria-label={`Nota de ${e.name}`}
                maxLength={200}
                value={e.note}
                onChange={(ev) => patchExercise(i, (x) => ({ ...x, note: ev.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <div aria-hidden="true" className="grid grid-cols-[2rem_1fr_4.25rem_4.25rem_2.75rem] items-center gap-2 text-[11px] font-semibold text-muted uppercase">
                <span>Série</span>
                <span>Anterior</span>
                <span className="text-center">kg</span>
                <span className="text-center">Reps</span>
                <span />
              </div>
              {e.sets.map((s, k) => {
                const prev = previous[k]
                return (
                  <div
                    key={k}
                    className={`grid grid-cols-[2rem_1fr_4.25rem_4.25rem_2.75rem] items-center gap-2 rounded-xl ${s.done ? 'bg-lavender/15' : ''}`}
                  >
                    <span className="flex h-9 items-center justify-center rounded-lg bg-chip text-sm font-bold">
                      {k + 1}
                    </span>
                    <span className="truncate text-sm text-muted">
                      {prev ? setLabel(prev) : '—'}
                    </span>
                    <input
                      className="input px-1 py-2 text-center text-sm"
                      inputMode="decimal"
                      aria-label={`Série ${k + 1}: carga em kg`}
                      placeholder={prev?.weight_kg ? formatKg(prev.weight_kg) : ''}
                      value={s.kg}
                      maxLength={7}
                      disabled={s.done}
                      onChange={(ev) => patchSet(i, k, (x) => ({ ...x, kg: ev.target.value }))}
                    />
                    <input
                      className="input px-1 py-2 text-center text-sm"
                      inputMode="numeric"
                      aria-label={`Série ${k + 1}: repetições`}
                      placeholder={prev?.reps != null ? String(prev.reps) : ''}
                      value={s.reps}
                      maxLength={3}
                      disabled={s.done}
                      onChange={(ev) => patchSet(i, k, (x) => ({ ...x, reps: ev.target.value }))}
                    />
                    <button
                      type="button"
                      aria-pressed={s.done}
                      aria-label={`Série ${k + 1} feita`}
                      className={`flex h-10 w-11 items-center justify-center rounded-lg border transition ${
                        s.done ? 'border-lavender bg-lavender text-black' : 'border-line text-muted hover:border-ink/40'
                      }`}
                      onClick={() => {
                        const next = toggleSet(s, prev)
                        if (next === s) return setError('Informe as repetições (e a carga, se houver) antes de marcar a série.')
                        patchSet(i, k, () => next)
                        if (next.done && e.restSec > 0) setRestEndsAt(Date.now() + e.restSec * 1000)
                      }}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2">
              {e.sets.length < MAX_SETS && (
                <button
                  type="button"
                  className="btn-outline flex-1 gap-2 py-2.5"
                  onClick={() => patchExercise(i, (x) => ({ ...x, sets: [...x.sets, { kg: '', reps: '', done: false }] }))}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar série
                </button>
              )}
              {e.sets.length > 1 && (
                <button
                  type="button"
                  className="btn-outline px-4 py-2.5 text-sm"
                  onClick={() => patchExercise(i, (x) => ({ ...x, sets: x.sets.slice(0, -1) }))}
                >
                  Remover última
                </button>
              )}
            </div>
          </article>
        )
      })}

      {workout.exercises.length < MAX_ROUTINE_EXERCISES && (
        <button type="button" className="btn-outline w-full gap-2" onClick={() => setPicking(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar exercício
        </button>
      )}

      {confirmDiscard ? (
        <div className="card space-y-3 text-sm">
          <p>Descartar este treino? As séries marcadas não serão salvas.</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline flex-1 text-attention"
              onClick={() => {
                writeDraft(me, null)
                navigate('/plano')
              }}
            >
              Descartar
            </button>
            <button type="button" className="btn-outline flex-1" onClick={() => setConfirmDiscard(false)}>
              Continuar treino
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="min-h-11 w-full text-sm font-semibold text-attention" onClick={() => setConfirmDiscard(true)}>
          Descartar treino
        </button>
      )}

      </fieldset>

      {restLeft > 0 && (
        <div
          role="timer"
          aria-label="Descanso"
          className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-lavender px-4 py-3 text-black shadow-lg lg:bottom-6"
        >
          <span className="flex items-center gap-2 font-semibold">
            <Timer className="h-5 w-5" aria-hidden="true" /> Descanso: {durationLabel(restLeft)}
          </span>
          <button type="button" className="flex min-h-11 items-center gap-1 text-sm font-semibold" onClick={() => setRestEndsAt(null)}>
            <X className="h-4 w-4" aria-hidden="true" /> Pular
          </button>
        </div>
      )}

      {picking && (
        <ExercisePicker
          done={recent}
          onClose={() => setPicking(false)}
          onPick={(e) => {
            update({ ...workout, exercises: [...workout.exercises, activeExercise(e)] })
            setPicking(false)
          }}
        />
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-base font-bold tabular-nums">{value}</dd>
    </div>
  )
}
