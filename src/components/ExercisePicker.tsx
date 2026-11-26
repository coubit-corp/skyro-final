import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  EXERCISE_CATALOG,
  EXERCISE_NAME_MAX,
  MUSCLES,
  muscleLabel,
  normalizeName,
  searchExercises,
  type CatalogExercise,
  type Muscle,
} from '../lib/workouts'
import { ChipTabs, Modal } from './ui'

const FILTERS: { value: Muscle | 'todos'; label: string }[] = [{ value: 'todos', label: 'Todos' }, ...MUSCLES]

/** Escolher um exercício da lista (com busca e filtro por músculo) ou criar um novo. */
export function ExercisePicker({
  recent,
  onPick,
  onClose,
}: {
  recent: CatalogExercise[]
  onPick: (e: CatalogExercise) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'todos'>('todos')
  const [creating, setCreating] = useState(false)
  const [newMuscle, setNewMuscle] = useState<Muscle>('outro')

  // Os que a pessoa já fez (inclusive os que ela criou) entram na busca junto com a lista.
  const all = useMemo(() => {
    const known = new Set(EXERCISE_CATALOG.map((e) => normalizeName(e.name)))
    return [...recent.filter((e) => !known.has(normalizeName(e.name))), ...EXERCISE_CATALOG]
  }, [recent])
  const results = searchExercises(all, query, muscle)
  const browsing = !query.trim() && muscle === 'todos'
  const name = query.trim().slice(0, EXERCISE_NAME_MAX)
  const exists = all.some((e) => normalizeName(e.name) === normalizeName(name))

  const Row = ({ e }: { e: CatalogExercise }) => (
    <li>
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left"
        onClick={() => onPick(e)}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold break-words">{e.name}</span>
          <span className="block text-xs text-muted">{muscleLabel(e.muscle)}</span>
        </span>
        <Plus className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      </button>
    </li>
  )

  return (
    <Modal open onClose={onClose} title="Adicionar exercício">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          className="input pl-9"
          placeholder="Buscar exercício"
          aria-label="Buscar exercício"
          value={query}
          maxLength={EXERCISE_NAME_MAX}
          onChange={(e) => {
            setQuery(e.target.value)
            setCreating(false)
          }}
        />
      </div>
      <ChipTabs label="Músculo" options={FILTERS} value={muscle} onChange={setMuscle} />

      <div className="max-h-[45vh] overflow-y-auto">
        {browsing && recent.length > 0 && (
          <>
            <h3 className="eyebrow mb-1">Exercícios recentes</h3>
            <ul className="mb-3 divide-y divide-line">
              {recent.map((e) => (
                <Row key={`r-${e.name}`} e={e} />
              ))}
            </ul>
            <h3 className="eyebrow mb-1">Todos os exercícios</h3>
          </>
        )}
        {results.length > 0 ? (
          <ul className="divide-y divide-line">
            {results.map((e) => (
              <Row key={e.name} e={e} />
            ))}
          </ul>
        ) : (
          <p className="py-3 text-sm text-muted">Nenhum exercício encontrado.</p>
        )}
      </div>

      {name.length >= 2 && !exists && !creating && (
        <button type="button" className="btn-outline w-full" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Criar "{name}"
        </button>
      )}
      {creating && (
        <div className="space-y-2 rounded-xl border border-line p-3">
          <label className="block text-sm font-semibold" htmlFor="novo-exercicio-musculo">
            Músculo principal de "{name}"
          </label>
          <select
            id="novo-exercicio-musculo"
            className="input"
            value={newMuscle}
            onChange={(e) => setNewMuscle(e.target.value as Muscle)}
          >
            {MUSCLES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary w-full" onClick={() => onPick({ name, muscle: newMuscle })}>
            Criar e adicionar
          </button>
        </div>
      )}
      <button type="button" className="btn-outline w-full" onClick={onClose}>
        Cancelar
      </button>
    </Modal>
  )
}
