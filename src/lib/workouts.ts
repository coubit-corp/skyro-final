// Meus treinos: o que a pessoa monta e registra por conta própria.
// Tudo aqui é cálculo puro; quem grava e protege os dados é o banco.

import { addDays } from './dates'
import type { HistoryEntry } from './evolution'
import { EXERCISE_GUIDES, guessEquipment, type Equipment } from './exerciseGuide'
import { parseVideoLink, watchUrl, type VideoRef } from './vitrine'

export type Muscle =
  | 'peito'
  | 'costas'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'quadriceps'
  | 'posteriores'
  | 'gluteos'
  | 'panturrilhas'
  | 'abdomen'
  | 'cardio'
  | 'outro'

export const MUSCLES: { value: Muscle; label: string }[] = [
  { value: 'peito', label: 'Peito' },
  { value: 'costas', label: 'Costas' },
  { value: 'ombros', label: 'Ombros' },
  { value: 'biceps', label: 'Bíceps' },
  { value: 'triceps', label: 'Tríceps' },
  { value: 'quadriceps', label: 'Quadríceps' },
  { value: 'posteriores', label: 'Posteriores' },
  { value: 'gluteos', label: 'Glúteos' },
  { value: 'panturrilhas', label: 'Panturrilhas' },
  { value: 'abdomen', label: 'Abdômen' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'outro', label: 'Outro' },
]

export function muscleLabel(m: string | undefined): string {
  return MUSCLES.find((x) => x.value === m)?.label ?? 'Outro'
}

export interface CatalogExercise {
  name: string
  muscle: Muscle
  /** Link do vídeo de como fazer, para exercícios criados pela pessoa. */
  video?: string
}

const c = (muscle: Muscle, names: string[]): CatalogExercise[] => names.map((name) => ({ name, muscle }))

export const EXERCISE_CATALOG: CatalogExercise[] = [
  ...c('peito', [
    'Supino reto (barra)',
    'Supino reto (halteres)',
    'Supino reto (máquina)',
    'Supino inclinado (barra)',
    'Supino inclinado (halteres)',
    'Supino inclinado (máquina)',
    'Supino declinado (barra)',
    'Crucifixo (máquina)',
    'Crucifixo (halteres)',
    'Crossover (cabo)',
    'Flexão de braço',
  ]),
  ...c('costas', [
    'Puxada alta (cabo)',
    'Puxada alta com pegada fechada (cabo)',
    'Barra fixa',
    'Remada sentada (cabo)',
    'Remada sentada com pegada aberta (cabo)',
    'Remada curvada (barra)',
    'Remada unilateral (halter)',
    'Remada (máquina)',
    'Pulldown com braços estendidos (cabo)',
    'Levantamento terra',
    'Superman',
  ]),
  ...c('ombros', [
    'Desenvolvimento de ombros (halteres)',
    'Desenvolvimento de ombros (máquina)',
    'Desenvolvimento de ombros (barra)',
    'Elevação lateral (halteres)',
    'Elevação lateral (máquina)',
    'Elevação lateral (cabo)',
    'Elevação frontal (halteres)',
    'Crucifixo inverso (máquina)',
    'Encolhimento de ombros (halteres)',
    'Flexão pike',
  ]),
  ...c('biceps', [
    'Rosca direta (barra)',
    'Rosca direta (halteres)',
    'Rosca alternada (halteres)',
    'Rosca martelo (halteres)',
    'Rosca Scott (máquina)',
    'Rosca direta (cabo)',
    'Rosca concentrada (halter)',
  ]),
  ...c('triceps', [
    'Tríceps na polia com corda',
    'Tríceps na polia com barra reta',
    'Tríceps testa (barra)',
    'Tríceps francês (halter)',
    'Tríceps coice (cabo)',
    'Tríceps no banco',
    'Paralelas',
  ]),
  ...c('quadriceps', [
    'Agachamento livre (barra)',
    'Agachamento no Smith',
    'Agachamento hack (máquina)',
    'Leg press 45°',
    'Cadeira extensora',
    'Afundo (halteres)',
    'Agachamento búlgaro (halteres)',
    'Agachamento (peso do corpo)',
  ]),
  ...c('posteriores', ['Mesa flexora', 'Cadeira flexora', 'Stiff (barra)', 'Stiff (halteres)', 'Levantamento terra romeno']),
  ...c('gluteos', ['Elevação pélvica (barra)', 'Elevação pélvica (peso do corpo)', 'Glúteo no cabo', 'Cadeira abdutora', 'Cadeira adutora']),
  ...c('panturrilhas', [
    'Panturrilha em pé (máquina)',
    'Panturrilha sentada (máquina)',
    'Panturrilha no leg press',
    'Panturrilha em pé (peso do corpo)',
  ]),
  ...c('abdomen', ['Abdominal supra', 'Abdominal na máquina', 'Abdominal no cabo', 'Elevação de pernas', 'Prancha']),
  ...c('cardio', ['Esteira', 'Bicicleta ergométrica', 'Elíptico', 'Escada', 'Remo ergômetro', 'Polichinelo']),
]

/** Sem acento, sem maiúscula e sem espaço sobrando: "Supino  Reto" = "supino reto". */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function searchExercises(
  list: CatalogExercise[],
  query: string,
  muscle: Muscle | 'todos',
  equipment: Equipment | 'todos' = 'todos',
): CatalogExercise[] {
  const words = normalizeName(query).split(' ').filter(Boolean)
  return list.filter((e) => {
    if (muscle !== 'todos' && e.muscle !== muscle) return false
    if (equipment !== 'todos' && exerciseEquipment(e.name) !== equipment) return false
    const name = normalizeName(e.name)
    return words.every((w) => name.includes(w))
  })
}

// ------------------------------------------------------------ guia do exercício

function catalogEntry(name: string): CatalogExercise | undefined {
  const key = normalizeName(name)
  return EXERCISE_CATALOG.find((e) => normalizeName(e.name) === key)
}

/**
 * O exercício da lista que corresponde a um nome escrito à mão (ex.: "Agachamento livre"
 * no plano do personal): o nome exato, senão a primeira variação ("Agachamento livre (barra)").
 */
export function findCatalogExercise(name: string): CatalogExercise | undefined {
  const key = normalizeName(name)
  if (!key) return undefined
  return (
    catalogEntry(name) ??
    EXERCISE_CATALOG.find((e) => normalizeName(e.name).startsWith(`${key} (`)) ??
    EXERCISE_CATALOG.find((e) => key.startsWith(normalizeName(e.name).replace(/ \(.*\)$/, '')))
  )
}

export function exerciseEquipment(name: string): Equipment | undefined {
  const known = catalogEntry(name)
  return (known && EXERCISE_GUIDES[known.name]?.equipment) ?? guessEquipment(name)
}

/** Link de vídeo aceito (YouTube, Vimeo ou Google Drive), já no formato padrão. Inválido: null. */
export function cleanVideoLink(raw: string): string | null {
  const ref = raw.trim() ? parseVideoLink(raw) : null
  return ref ? watchUrl(ref) : null
}

export interface ExerciseInfo {
  name: string
  muscle: Muscle
  secondary: Muscle[]
  equipment?: Equipment
  video: VideoRef | null
  steps: string[]
  /** Está na lista do app (com passo a passo), ou foi criado pela pessoa. */
  fromCatalog: boolean
}

/**
 * Tudo o que a tela mostra sobre um exercício. `known` são os exercícios que a pessoa
 * já usou (com o vídeo que ela anexou aos que criou).
 */
export function exerciseInfo(name: string, known: CatalogExercise[] = []): ExerciseInfo {
  const entry = catalogEntry(name)
  const guide = entry ? EXERCISE_GUIDES[entry.name] : undefined
  if (entry && guide) {
    return {
      name: entry.name,
      muscle: entry.muscle,
      secondary: guide.secondary,
      equipment: guide.equipment,
      video: { provider: 'youtube', id: guide.youtubeId },
      steps: guide.steps,
      fromCatalog: true,
    }
  }
  const key = normalizeName(name)
  const mine = known.find((e) => normalizeName(e.name) === key)
  const linked = known.find((e) => normalizeName(e.name) === key && e.video)
  return {
    name: mine?.name ?? name,
    muscle: mine?.muscle ?? 'outro',
    secondary: [],
    equipment: guessEquipment(name),
    video: linked?.video ? parseVideoLink(linked.video) : null,
    steps: [],
    fromCatalog: false,
  }
}

/** Endereço da tela do exercício. */
export function exercisePath(name: string): string {
  return `/plano/exercicio/${encodeURIComponent(name)}`
}

/** Estado da navegação para a tela do exercício: para onde o "voltar" leva. */
export interface ExerciseBack {
  back?: { to: string; label: string }
}

/** Outros exercícios da lista para o mesmo músculo principal. */
export function similarExercises(name: string, muscle: Muscle, limit = 6): CatalogExercise[] {
  const key = normalizeName(name)
  return EXERCISE_CATALOG.filter((e) => e.muscle === muscle && normalizeName(e.name) !== key).slice(0, limit)
}

// ------------------------------------------------------------ treinos montados

export const ROUTINE_NAME_MAX = 60
export const EXERCISE_NAME_MAX = 80
export const MAX_ROUTINE_EXERCISES = 30
export const MAX_SETS = 20
export const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 135, 150, 180, 240, 300]
export const DEFAULT_REST = 90

export interface RoutineExercise {
  name: string
  muscle: Muscle
  sets: number
  /** Texto livre: "10", "8-10", "até a falha". */
  reps: string
  rest_sec: number
  video?: string
}

export interface Routine {
  id: string
  name: string
  exercises: RoutineExercise[]
}

const withVideo = (e: { video?: string }) => (e.video ? { video: e.video } : {})

export function newRoutineExercise(e: CatalogExercise): RoutineExercise {
  return { name: e.name, muscle: e.muscle, sets: 3, reps: '10', rest_sec: DEFAULT_REST, ...withVideo(e) }
}

export function validateRoutine(name: string, exercises: RoutineExercise[]): string | null {
  const n = name.trim()
  if (!n) return 'Dê um nome ao treino.'
  if (n.length > ROUTINE_NAME_MAX) return `Use até ${ROUTINE_NAME_MAX} caracteres no nome.`
  if (exercises.length === 0) return 'Adicione pelo menos um exercício.'
  if (exercises.length > MAX_ROUTINE_EXERCISES) return `Use até ${MAX_ROUTINE_EXERCISES} exercícios por treino.`
  return null
}

/** "4 séries · 8-10 reps" */
export function routineExerciseSummary(e: RoutineExercise): string {
  const sets = `${e.sets} ${e.sets === 1 ? 'série' : 'séries'}`
  return e.reps.trim() ? `${sets} · ${e.reps.trim()} reps` : sets
}

/** 135 → "2min 15s" */
export function restLabel(sec: number): string {
  if (sec <= 0) return 'Sem descanso'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return [m ? `${m}min` : '', s ? `${s}s` : ''].filter(Boolean).join(' ')
}

/** 44 → "44s"; 754 → "12min 34s"; 3725 → "1h 02min" */
export function durationLabel(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec))
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}min ${String(sec % 60).padStart(2, '0')}s`
  return `${Math.floor(sec / 3600)}h ${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}min`
}

// ------------------------------------------------------------ treino em andamento

export interface ActiveSet {
  kg: string
  reps: string
  done: boolean
}

export interface ActiveExercise {
  name: string
  muscle: Muscle
  restSec: number
  /** Meta de repetições do treino montado, se houver. */
  target: string
  note: string
  sets: ActiveSet[]
  video?: string
}

export interface ActiveWorkout {
  title: string
  /** Momento em que começou (ms). */
  startedAt: number
  exercises: ActiveExercise[]
}

const emptySet = (): ActiveSet => ({ kg: '', reps: '', done: false })

export function startWorkout(routine: Routine | null, now: number): ActiveWorkout {
  return {
    title: routine?.name ?? 'Treino livre',
    startedAt: now,
    exercises: (routine?.exercises ?? []).map((e) => ({
      name: e.name,
      muscle: e.muscle,
      restSec: e.rest_sec,
      target: e.reps,
      note: '',
      sets: Array.from({ length: Math.min(Math.max(e.sets, 1), MAX_SETS) }, emptySet),
      ...withVideo(e),
    })),
  }
}

export function activeExercise(e: CatalogExercise): ActiveExercise {
  return { name: e.name, muscle: e.muscle, restSec: DEFAULT_REST, target: '', note: '', sets: [emptySet()], ...withVideo(e) }
}

/** "12,5" → 12.5; vazio ou inválido → null. */
export function parseNumber(raw: string): number | null {
  const t = raw.trim().replace(',', '.')
  if (!t || !/^\d+(\.\d+)?$/.test(t)) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
export function formatKg(kg: number): string {
  return num.format(kg)
}

export interface LoggedSet {
  reps: number | null
  weight_kg: number | null
}

/** "40 kg x 8", "x 12" (peso do corpo), "40 kg" */
export function setLabel(s: LoggedSet): string {
  const w = s.weight_kg ? `${formatKg(s.weight_kg)} kg` : ''
  const r = s.reps != null ? `x ${s.reps}` : ''
  return [w, r].filter(Boolean).join(' ') || '—'
}

export function workoutTotals(w: ActiveWorkout): { volumeKg: number; sets: number } {
  let volumeKg = 0
  let sets = 0
  for (const e of w.exercises) {
    for (const s of e.sets) {
      if (!s.done) continue
      sets++
      volumeKg += (parseNumber(s.kg) ?? 0) * (parseNumber(s.reps) ?? 0)
    }
  }
  return { volumeKg, sets }
}

/**
 * Marca ou desmarca a série. Ao marcar com campos vazios, usa o que foi feito
 * na série de mesmo número do treino anterior. Sem repetições, não marca.
 */
export function toggleSet(set: ActiveSet, previous: LoggedSet | undefined): ActiveSet {
  if (set.done) return { ...set, done: false }
  const kg = set.kg.trim() || (previous?.weight_kg ? formatKg(previous.weight_kg) : '')
  const reps = set.reps.trim() || (previous?.reps != null ? String(previous.reps) : '')
  const r = parseNumber(reps)
  if (r == null || r <= 0 || r > 999 || !Number.isInteger(r)) return set
  const k = kg.trim() === '' ? 0 : parseNumber(kg)
  if (k == null || k > 2000) return set
  return { kg, reps, done: true }
}

export interface FinishedWorkout {
  title: string
  details: {
    duration_min: number
    exercises: { name: string; muscle: Muscle; note?: string; video?: string; sets: LoggedSet[] }[]
  }
}

/** Só as séries marcadas entram. Sem nenhuma, devolve a mensagem de erro. */
export function finishWorkout(w: ActiveWorkout, now: number): FinishedWorkout | string {
  const exercises = w.exercises
    .map((e) => ({
      name: e.name.trim().slice(0, EXERCISE_NAME_MAX),
      muscle: e.muscle,
      ...(e.note.trim() ? { note: e.note.trim().slice(0, 200) } : {}),
      ...withVideo(e),
      sets: e.sets
        .filter((s) => s.done)
        .map((s) => ({ reps: parseNumber(s.reps), weight_kg: parseNumber(s.kg) || null })),
    }))
    .filter((e) => e.sets.length > 0)
  if (exercises.length === 0) return 'Marque pelo menos uma série feita antes de concluir.'
  const minutes = Math.round((now - w.startedAt) / 60_000)
  return {
    title: w.title.trim().slice(0, 120) || 'Treino',
    details: { duration_min: Math.min(Math.max(minutes, 1), 600), exercises },
  }
}

// ------------------------------------------------------------ histórico por exercício

type Workout = Pick<HistoryEntry, 'id' | 'occurred_on' | 'title' | 'details'>

function matching(w: Workout, name: string) {
  const key = normalizeName(name)
  return (w.details?.exercises ?? []).filter((e) => normalizeName(e.name) === key)
}

function setsOf(w: Workout, name: string): LoggedSet[] {
  return matching(w, name).flatMap((e) => e.sets)
}

/**
 * Séries do treino mais recente que teve este exercício. `history` vem do mais novo para o mais antigo.
 * `occurrence`: quando o treino repete o exercício, qual das vezes (0 = a primeira).
 */
export function previousSets(history: Workout[], name: string, occurrence = 0): LoggedSet[] {
  for (const w of history) {
    const found = matching(w, name)
    if (found.length) return found[occurrence]?.sets ?? []
  }
  return []
}

/** 1RM estimado (Epley). Uma repetição é o próprio peso. */
export function estimate1RM(kg: number, reps: number): number {
  return reps <= 1 ? kg : kg * (1 + reps / 30)
}

export interface ExerciseStats {
  /** Um ponto por treino, do mais antigo para o mais novo. */
  points: { date: string; maxKg: number; best1rm: number }[]
  maxWeight: { kg: number; date: string } | null
  best1rm: { kg: number; date: string } | null
  bestSet: { kg: number; reps: number; date: string } | null
  sessions: { id: string; date: string; title: string; sets: LoggedSet[]; note?: string }[]
}

export function exerciseStats(history: Workout[], name: string): ExerciseStats {
  const stats: ExerciseStats = { points: [], maxWeight: null, best1rm: null, bestSet: null, sessions: [] }
  for (const w of history) {
    const sets = setsOf(w, name)
    if (!sets.length) continue
    const note = matching(w, name)
      .map((e) => (e as { note?: unknown }).note)
      .filter((n): n is string => typeof n === 'string' && n.trim() !== '')
      .join(' · ')
    stats.sessions.push({ id: w.id, date: w.occurred_on, title: w.title, sets, ...(note ? { note } : {}) })
    let maxKg = 0
    let best = 0
    for (const s of sets) {
      const kg = s.weight_kg ?? 0
      const reps = s.reps ?? 0
      if (kg <= 0) continue
      maxKg = Math.max(maxKg, kg)
      if (reps > 0) {
        best = Math.max(best, estimate1RM(kg, reps))
        if (!stats.bestSet || kg * reps > stats.bestSet.kg * stats.bestSet.reps) {
          stats.bestSet = { kg, reps, date: w.occurred_on }
        }
      }
    }
    if (maxKg > 0) stats.points.push({ date: w.occurred_on, maxKg, best1rm: best })
  }
  // `history` vem do mais novo para o mais antigo; inverter antes mantém a ordem dentro do mesmo dia.
  stats.points.reverse().sort((a, b) => a.date.localeCompare(b.date))
  for (const p of stats.points) {
    if (!stats.maxWeight || p.maxKg > stats.maxWeight.kg) stats.maxWeight = { kg: p.maxKg, date: p.date }
    if (p.best1rm > 0 && (!stats.best1rm || p.best1rm > stats.best1rm.kg)) stats.best1rm = { kg: p.best1rm, date: p.date }
  }
  return stats
}

/** Exercícios já feitos, do mais recente para o mais antigo, sem repetir. */
export function recentExercises(history: Workout[], limit = Infinity): CatalogExercise[] {
  const seen = new Set<string>()
  const out: CatalogExercise[] = []
  for (const w of history) {
    for (const e of w.details?.exercises ?? []) {
      const key = normalizeName(e.name)
      if (!key || seen.has(key)) continue
      seen.add(key)
      const known = EXERCISE_CATALOG.find((x) => normalizeName(x.name) === key)
      const muscle = MUSCLES.some((m) => m.value === (e as { muscle?: string }).muscle)
        ? ((e as { muscle?: Muscle }).muscle as Muscle)
        : (known?.muscle ?? 'outro')
      const video = (e as { video?: unknown }).video
      out.push({ name: known?.name ?? e.name, muscle, ...(!known && typeof video === 'string' ? { video } : {}) })
      if (out.length >= limit) return out
    }
  }
  return out
}

// ------------------------------------------------------------ músculos da semana

/** Músculo principal de um exercício registrado (o que veio salvo, ou o da lista). */
function muscleOf(e: { name: string; muscle?: unknown }): Muscle {
  if (MUSCLES.some((m) => m.value === e.muscle) && e.muscle !== 'outro') return e.muscle as Muscle
  return catalogEntry(e.name)?.muscle ?? 'outro'
}

/**
 * Séries feitas por músculo nos últimos `days` dias (hoje incluso). O músculo principal
 * conta a série inteira; os secundários, meia série.
 */
export function muscleSets(history: Workout[], todayIso: string, days = 7): Partial<Record<Muscle, number>> {
  const from = addDays(todayIso, -(days - 1))
  const out: Partial<Record<Muscle, number>> = {}
  const add = (m: Muscle, n: number) => {
    if (m === 'outro' || m === 'cardio') return
    out[m] = (out[m] ?? 0) + n
  }
  for (const w of history) {
    if (w.occurred_on < from || w.occurred_on > todayIso) continue
    for (const e of w.details?.exercises ?? []) {
      const sets = Array.isArray(e.sets) ? e.sets.length : 0
      if (!sets) continue
      add(muscleOf(e), sets)
      const entry = catalogEntry(e.name)
      for (const s of (entry && EXERCISE_GUIDES[entry.name]?.secondary) || []) add(s, sets / 2)
    }
  }
  return out
}

// ------------------------------------------------------------ rascunho no aparelho

const DRAFT_KEY = 'skyro.treino.ativo'

/** O treino em andamento fica guardado no aparelho, para não se perder se a tela fechar. */
export function readDraft(userId: string): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}.${userId}`)
    const w = raw ? (JSON.parse(raw) as ActiveWorkout) : null
    return w && typeof w.startedAt === 'number' && Array.isArray(w.exercises) ? w : null
  } catch {
    return null
  }
}

export function writeDraft(userId: string, w: ActiveWorkout | null) {
  try {
    if (w) localStorage.setItem(`${DRAFT_KEY}.${userId}`, JSON.stringify(w))
    else localStorage.removeItem(`${DRAFT_KEY}.${userId}`)
  } catch {
    // sem armazenamento local, o treino vale só enquanto a tela estiver aberta
  }
}
