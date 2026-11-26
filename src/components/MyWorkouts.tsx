import { Dumbbell, Pencil, Play, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { useRoutines } from '../hooks/useWorkouts'
import { muscleLabel, readDraft, startWorkout, writeDraft, type Routine } from '../lib/workouts'

/** Treinos que a própria pessoa montou, com ou sem profissional. Fica na aba Treino do plano. */
export function MyWorkouts() {
  const me = useAuth().session?.user.id
  const routines = useRoutines()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(() => (me ? readDraft(me) : null))

  // Sem a migration no banco, a seção não aparece.
  if (!me || !routines.data) return null

  const start = (r: Routine | null) => {
    writeDraft(me, startWorkout(r, Date.now()))
    navigate('/plano/treino')
  }

  return (
    <section aria-label="Meus treinos" className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">Meus treinos</h2>
        <p className="text-sm text-muted">Monte seus treinos e registre cada série, com ou sem personal.</p>
      </div>

      {draft && (
        <div className="card space-y-3">
          <p className="text-sm">
            <span className="font-semibold">Treino em andamento:</span> {draft.title}
          </p>
          <div className="flex gap-2">
            <Link to="/plano/treino" className="btn-primary flex-1">
              Continuar
            </Link>
            <button
              type="button"
              className="btn-outline flex-1"
              onClick={() => {
                writeDraft(me, null)
                setDraft(null)
              }}
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {routines.data.length === 0 ? (
        <p className="card text-sm text-muted">
          Você ainda não montou nenhum treino. Crie o primeiro (por exemplo, "Dia 1") ou comece um treino livre.
        </p>
      ) : (
        <ul className="space-y-3">
          {routines.data.map((r) => (
            <li key={r.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold break-words">{r.name}</h3>
                  <p className="text-sm text-muted">
                    {r.exercises.length} {r.exercises.length === 1 ? 'exercício' : 'exercícios'} ·{' '}
                    {[...new Set(r.exercises.map((e) => muscleLabel(e.muscle)))].slice(0, 3).join(', ')}
                  </p>
                </div>
                <Link
                  to={`/plano/treinos/${r.id}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-chip hover:text-ink"
                  aria-label={`Editar ${r.name}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <ul className="space-y-1 text-sm text-muted">
                {r.exercises.slice(0, 4).map((e, i) => (
                  <li key={i} className="truncate">
                    {e.sets} x {e.reps || '—'} · {e.name}
                  </li>
                ))}
                {r.exercises.length > 4 && <li>e mais {r.exercises.length - 4}</li>}
              </ul>
              <button type="button" className="btn-primary w-full" disabled={Boolean(draft)} onClick={() => start(r)}>
                <Play className="h-4 w-4" aria-hidden="true" /> Iniciar treino
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/plano/treinos/novo" className="btn-outline flex-1 gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" /> Novo treino
        </Link>
        <button type="button" className="btn-outline flex-1 gap-2" disabled={Boolean(draft)} onClick={() => start(null)}>
          <Dumbbell className="h-4 w-4" aria-hidden="true" /> Treino livre
        </button>
      </div>
    </section>
  )
}
