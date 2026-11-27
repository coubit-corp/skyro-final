import { ArrowDown, ArrowUp, PlayCircle, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ExerciseGuidePanel } from '../../components/ExerciseGuide'
import { ExercisePicker } from '../../components/ExercisePicker'
import { ErrorState, Modal, PageHeader, Skeleton } from '../../components/ui'
import { useDeleteRoutine, useRoutines, useSaveRoutine, useWorkoutHistory, WORKOUTS_NOT_ACTIVE } from '../../hooks/useWorkouts'
import {
  exerciseInfo,
  MAX_ROUTINE_EXERCISES,
  MAX_SETS,
  muscleLabel,
  newRoutineExercise,
  recentExercises,
  REST_OPTIONS,
  restLabel,
  ROUTINE_NAME_MAX,
  validateRoutine,
  type Routine,
  type RoutineExercise,
} from '../../lib/workouts'

const BACK = { to: '/plano', label: 'Meu plano' }

/** Criar (/plano/treinos/novo) ou editar (/plano/treinos/:id) um treino montado pela pessoa. */
export function TreinoMontar() {
  const { id } = useParams()
  const routines = useRoutines()

  if (routines.isLoading) return <Skeleton className="h-64" />
  if (routines.error) return <ErrorState message={routines.error.message} onRetry={() => routines.refetch()} />
  if (!routines.data) {
    return (
      <section className="space-y-4">
        <PageHeader title="Novo treino" back={BACK} />
        <p className="card text-sm text-muted">{WORKOUTS_NOT_ACTIVE}</p>
      </section>
    )
  }
  const editing = id ? routines.data.find((r) => r.id === id) : undefined
  if (id && !editing) return <Navigate to="/plano" replace />
  return <Editor key={id ?? 'novo'} routine={editing} />
}

function Editor({ routine }: { routine?: Routine }) {
  const navigate = useNavigate()
  const save = useSaveRoutine()
  const remove = useDeleteRoutine()
  const history = useWorkoutHistory()
  const [name, setName] = useState(routine?.name ?? '')
  const [exercises, setExercises] = useState<RoutineExercise[]>(routine?.exercises ?? [])
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [guide, setGuide] = useState<RoutineExercise | null>(null)
  const recent = useMemo(() => recentExercises(history.data ?? []), [history.data])

  const patch = (i: number, p: Partial<RoutineExercise>) =>
    setExercises((list) => list.map((e, j) => (j === i ? { ...e, ...p } : e)))
  const move = (i: number, by: number) =>
    setExercises((list) => {
      const next = [...list]
      ;[next[i], next[i + by]] = [next[i + by], next[i]]
      return next
    })

  const submit = () => {
    const problem = validateRoutine(name, exercises)
    setError(problem)
    if (problem) return
    save.mutate({ id: routine?.id, name, exercises }, { onSuccess: () => navigate('/plano') })
  }

  return (
    <section className="space-y-4">
      <PageHeader title={routine ? 'Editar treino' : 'Novo treino'} back={BACK} />

      <div className="card space-y-2">
        <label htmlFor="treino-nome" className="block text-sm font-semibold">
          Nome do treino
        </label>
        <input
          id="treino-nome"
          className="input"
          value={name}
          maxLength={ROUTINE_NAME_MAX}
          placeholder="Dia 1 · Peito e tríceps"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {exercises.length === 0 ? (
        <p className="card text-sm text-muted">Adicione os exercícios na ordem em que você faz.</p>
      ) : (
        <ol className="space-y-3">
          {exercises.map((e, i) => (
            <li key={i} className="card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-semibold break-words">{e.name}</h2>
                  <p className="text-xs text-muted">{muscleLabel(e.muscle)}</p>
                </div>
                <div className="flex shrink-0">
                  <IconButton label={`Como fazer: ${e.name}`} onClick={() => setGuide(e)}>
                    <PlayCircle className="h-5 w-5" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Subir ${e.name}`} disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Descer ${e.name}`} disabled={i === exercises.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Remover ${e.name}`} onClick={() => setExercises((l) => l.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1 text-xs font-semibold text-muted">
                  Séries
                  <select
                    className="input"
                    value={e.sets}
                    onChange={(ev) => patch(i, { sets: Number(ev.target.value) })}
                  >
                    {Array.from({ length: MAX_SETS }, (_, n) => n + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted">
                  Repetições
                  <input
                    className="input"
                    value={e.reps}
                    maxLength={20}
                    placeholder="8-10"
                    onChange={(ev) => patch(i, { reps: ev.target.value })}
                  />
                </label>
                <label className="space-y-1 text-xs font-semibold text-muted">
                  Descanso
                  <select
                    className="input"
                    value={e.rest_sec}
                    onChange={(ev) => patch(i, { rest_sec: Number(ev.target.value) })}
                  >
                    {[...new Set([...REST_OPTIONS, e.rest_sec])].sort((a, b) => a - b).map((s) => (
                      <option key={s} value={s}>
                        {restLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </li>
          ))}
        </ol>
      )}

      {exercises.length < MAX_ROUTINE_EXERCISES && (
        <button type="button" className="btn-outline w-full gap-2" onClick={() => setPicking(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar exercício
        </button>
      )}

      {(error || save.error) && (
        <p className="text-sm text-attention" role="alert">
          {error ?? save.error?.message}
        </p>
      )}
      <button type="button" className="btn-primary w-full" disabled={save.isPending} onClick={submit}>
        {save.isPending ? 'Salvando…' : 'Salvar treino'}
      </button>

      {routine &&
        (confirmDelete ? (
          <div className="card space-y-3 text-sm">
            <p>Apagar "{routine.name}"? Os treinos que você já registrou continuam na sua história.</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-outline flex-1 text-attention"
                disabled={remove.isPending}
                onClick={() => remove.mutate(routine.id, { onSuccess: () => navigate('/plano') })}
              >
                Apagar
              </button>
              <button type="button" className="btn-outline flex-1" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </button>
            </div>
            {remove.isError && <p className="text-attention">Não deu para apagar. Tente de novo.</p>}
          </div>
        ) : (
          <button type="button" className="min-h-11 w-full text-sm font-semibold text-attention" onClick={() => setConfirmDelete(true)}>
            Apagar treino
          </button>
        ))}

      {guide && (
        <Modal open onClose={() => setGuide(null)} title={guide.name}>
          <div className="max-h-[65vh] overflow-y-auto">
            <ExerciseGuidePanel info={exerciseInfo(guide.name, [guide, ...recent])} />
          </div>
          <button type="button" className="btn-outline w-full" onClick={() => setGuide(null)}>
            Fechar
          </button>
        </Modal>
      )}

      {picking && (
        <ExercisePicker
          done={recent}
          onClose={() => setPicking(false)}
          onPick={(e) => {
            setExercises((l) => [...l, newRoutineExercise(e)])
            setPicking(false)
          }}
        />
      )}
    </section>
  )
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-10 items-center justify-center rounded-full text-muted transition hover:bg-chip hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  )
}
