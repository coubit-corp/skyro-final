import { ArrowLeft, Info, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EQUIPMENTS, equipmentLabel, type Equipment } from '../lib/exerciseGuide'
import {
  cleanVideoLink,
  EXERCISE_CATALOG,
  EXERCISE_NAME_MAX,
  exerciseEquipment,
  exerciseInfo,
  MUSCLES,
  muscleLabel,
  normalizeName,
  searchExercises,
  type CatalogExercise,
  type Muscle,
} from '../lib/workouts'
import { ExerciseGuidePanel } from './ExerciseGuide'
import { Modal } from './ui'

/** Escolher um exercício da lista (com busca e filtros por músculo e equipamento) ou criar um novo. */
export function ExercisePicker({
  done,
  onPick,
  onClose,
}: {
  /** Todos os exercícios que a pessoa já fez, do mais recente para o mais antigo. */
  done: CatalogExercise[]
  onPick: (e: CatalogExercise) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | 'todos'>('todos')
  const [equipment, setEquipment] = useState<Equipment | 'todos'>('todos')
  const [creating, setCreating] = useState(false)
  const [newMuscle, setNewMuscle] = useState<Muscle>('outro')
  const [newVideo, setNewVideo] = useState('')
  const [videoError, setVideoError] = useState(false)
  const [viewing, setViewing] = useState<CatalogExercise | null>(null)

  // Os que a pessoa já fez (inclusive os que ela criou) entram na busca junto com a lista.
  const all = useMemo(() => {
    const known = new Set(EXERCISE_CATALOG.map((e) => normalizeName(e.name)))
    return [...done.filter((e) => !known.has(normalizeName(e.name))), ...EXERCISE_CATALOG]
  }, [done])
  const recent = done.slice(0, 8)
  const results = searchExercises(all, query, muscle, equipment)
  const browsing = !query.trim() && muscle === 'todos' && equipment === 'todos'
  const name = query.trim().slice(0, EXERCISE_NAME_MAX)
  const exists = all.some((e) => normalizeName(e.name) === normalizeName(name))

  if (viewing) {
    const info = exerciseInfo(viewing.name, done)
    return (
      <Modal open onClose={onClose} title={viewing.name}>
        <div className="max-h-[60vh] overflow-y-auto">
          <ExerciseGuidePanel info={info} />
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-outline flex-1 gap-2" onClick={() => setViewing(null)}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar
          </button>
          <button type="button" className="btn-primary flex-1 gap-2" onClick={() => onPick(viewing)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar
          </button>
        </div>
      </Modal>
    )
  }

  const Row = ({ e }: { e: CatalogExercise }) => {
    const eq = exerciseEquipment(e.name)
    return (
      <li className="flex items-center gap-1">
        <button
          type="button"
          className="flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 py-2 text-left"
          onClick={() => onPick(e)}
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold break-words">{e.name}</span>
            <span className="block text-xs text-muted">
              {muscleLabel(e.muscle)}
              {eq && ` · ${equipmentLabel(eq)}`}
            </span>
          </span>
          <Plus className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Como fazer: ${e.name}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-chip hover:text-ink"
          onClick={() => setViewing(e)}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </li>
    )
  }

  const create = () => {
    const video = newVideo.trim() ? cleanVideoLink(newVideo) : null
    if (newVideo.trim() && !video) return setVideoError(true)
    onPick({ name, muscle: newMuscle, ...(video ? { video } : {}) })
  }

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
          <label className="block text-sm font-semibold" htmlFor="novo-exercicio-video">
            Vídeo de como fazer <span className="font-normal text-muted">(opcional)</span>
          </label>
          <input
            id="novo-exercicio-video"
            className="input"
            inputMode="url"
            placeholder="Link do YouTube, Vimeo ou Google Drive"
            maxLength={300}
            value={newVideo}
            aria-invalid={videoError}
            aria-describedby={videoError ? 'novo-exercicio-video-erro' : undefined}
            onChange={(e) => {
              setNewVideo(e.target.value)
              setVideoError(false)
            }}
          />
          {videoError && (
            <p id="novo-exercicio-video-erro" className="text-sm text-attention" role="alert">
              Use um link de vídeo do YouTube, Vimeo ou Google Drive.
            </p>
          )}
          <button type="button" className="btn-primary w-full" onClick={create}>
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
