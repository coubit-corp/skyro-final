import { ChevronRight, PlayCircle, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui'
import { useKnownExercises } from '../../hooks/useWorkouts'
import { EQUIPMENTS, equipmentLabel, type Equipment } from '../../lib/exerciseGuide'
import { videoThumbnail } from '../../lib/vitrine'
import {
  EXERCISE_CATALOG,
  exerciseEquipment,
  exerciseInfo,
  exercisePath,
  MUSCLES,
  muscleLabel,
  normalizeName,
  searchExercises,
  type CatalogExercise,
  type Muscle,
} from '../../lib/workouts'

const BACK = { to: '/plano/exercicios', label: 'Exercícios' }

/** Biblioteca: todos os exercícios, cada um com vídeo e passo a passo. */
export function Exercicios() {
  const known = useKnownExercises()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'todos'>('todos')
  const [equipment, setEquipment] = useState<Equipment | 'todos'>('todos')

  const all = useMemo(() => {
    const inCatalog = new Set(EXERCISE_CATALOG.map((e) => normalizeName(e.name)))
    return [...EXERCISE_CATALOG, ...known.filter((e) => !inCatalog.has(normalizeName(e.name)))]
  }, [known])
  const results = searchExercises(all, query, muscle, equipment)

  return (
    <section className="space-y-4">
      <PageHeader
        title="Exercícios"
        subtitle="Veja o vídeo e o passo a passo de cada exercício antes de montar seu treino."
        back={{ to: '/plano', label: 'Meu plano' }}
      />

      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            className="input pl-9"
            placeholder="Buscar exercício"
            aria-label="Buscar exercício"
            value={query}
            maxLength={80}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="input py-2 text-sm"
            aria-label="Equipamento"
            value={equipment}
            onChange={(e) => setEquipment(e.target.value as Equipment | 'todos')}
          >
            <option value="todos">Todos os equipamentos</option>
            {EQUIPMENTS.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
          <select
            className="input py-2 text-sm"
            aria-label="Músculo"
            value={muscle}
            onChange={(e) => setMuscle(e.target.value as Muscle | 'todos')}
          >
            <option value="todos">Todos os músculos</option>
            {MUSCLES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {results.length} {results.length === 1 ? 'exercício' : 'exercícios'}
      </p>

      {results.length === 0 ? (
        <p className="card text-sm text-muted">Nenhum exercício encontrado. Você pode criar um novo ao montar seu treino.</p>
      ) : (
        <ul className="card divide-y divide-line p-0">
          {results.map((e) => (
            <Row key={e.name} e={e} known={known} />
          ))}
        </ul>
      )}
    </section>
  )
}

function Row({ e, known }: { e: CatalogExercise; known: CatalogExercise[] }) {
  const info = exerciseInfo(e.name, known)
  const thumb = info.video ? videoThumbnail(info.video) : null
  const eq = exerciseEquipment(e.name)
  return (
    <li>
      <Link to={exercisePath(e.name)} state={{ back: BACK }} className="flex items-center gap-3 px-4 py-3 transition hover:bg-chip">
        <span className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-chip">
          {thumb && (
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(ev) => (ev.currentTarget.style.display = 'none')}
            />
          )}
          {info.video && (
            <PlayCircle className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold break-words">{e.name}</span>
          <span className="block text-xs text-muted">
            {muscleLabel(e.muscle)}
            {eq && ` · ${equipmentLabel(eq)}`}
            {!info.video && ' · sem vídeo'}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  )
}
