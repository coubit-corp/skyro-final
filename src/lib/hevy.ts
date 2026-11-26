// Importação dos treinos exportados pelo Hevy (CSV: uma linha por série).
// Só lê o arquivo e monta a prévia; quem garante "sem duplicata" é o banco,
// pela chave de origem (source_key) de cada treino.

export const HEVY_MAX_BYTES = 5 * 1024 * 1024
export const HEVY_MAX_WORKOUTS = 2000
const MAX_EXERCISES = 40
const MAX_SETS = 30

export interface ImportedSet {
  reps: number | null
  weight_kg: number | null
}
export interface ImportedExercise {
  name: string
  sets: ImportedSet[]
}
export interface ImportedWorkout {
  source_key: string
  occurred_on: string
  title: string
  details: { duration_min?: number; exercises: ImportedExercise[] }
}
export interface HevyPreview {
  workouts: ImportedWorkout[]
  /** Linhas sem data ou sem exercício reconhecível. */
  skippedRows: number
  from: string | null
  to: string | null
  /** Exercícios mais frequentes, para a pessoa conferir. */
  exercises: { name: string; count: number }[]
}

/** CSV com aspas, vírgulas e quebras de linha dentro de campo. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f !== '')) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((f) => f !== '')) rows.push(row)
  return rows
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4, may: 5, mai: 5, jun: 6,
  jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12,
}

function validDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** "28 Mar 2024, 18:30" ou "2024-03-28 18:30:00" → { date: "2024-03-28", minutes }. */
export function parseHevyTime(raw: string): { date: string; minutes: number } | null {
  const s = raw.trim()
  let m = /^(\d{1,2}) ([A-Za-zçÇ]{3})\.? (\d{4}),? (\d{1,2}):(\d{2})/.exec(s)
  if (m) {
    const month = MONTHS[m[2].toLowerCase()]
    const date = month ? validDate(Number(m[3]), month, Number(m[1])) : null
    return date ? { date, minutes: Number(m[4]) * 60 + Number(m[5]) } : null
  }
  m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s)
  if (m) {
    const date = validDate(Number(m[1]), Number(m[2]), Number(m[3]))
    return date ? { date, minutes: Number(m[4]) * 60 + Number(m[5]) } : null
  }
  return null
}

function num(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === '') return null
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

const LB_TO_KG = 0.45359237

/**
 * Lê o CSV do Hevy. Devolve null se o arquivo não tem as colunas esperadas.
 * Treinos com data depois de `todayIso` ficam de fora.
 */
export function parseHevyCsv(text: string, todayIso: string): HevyPreview | null {
  const rows = parseCsv(text)
  if (rows.length < 2) return null
  const header = rows[0].map((h) => h.trim().toLowerCase())
  const col = (name: string) => header.indexOf(name)
  const iTitle = col('title')
  const iStart = col('start_time')
  const iEnd = col('end_time')
  const iExercise = col('exercise_title')
  const iReps = col('reps')
  const iKg = col('weight_kg')
  const iLbs = col('weight_lbs')
  if (iTitle < 0 || iStart < 0 || iExercise < 0) return null

  const byKey = new Map<string, ImportedWorkout>()
  let skippedRows = 0
  for (const r of rows.slice(1)) {
    const startRaw = (r[iStart] ?? '').trim()
    const start = parseHevyTime(startRaw)
    const exercise = (r[iExercise] ?? '').trim().slice(0, 80)
    if (!start || !exercise || start.date > todayIso) {
      skippedRows++
      continue
    }
    const title = ((r[iTitle] ?? '').trim() || 'Treino').slice(0, 120)
    const key = `${startRaw}|${title}`.slice(0, 200)
    let w = byKey.get(key)
    if (!w) {
      if (byKey.size >= HEVY_MAX_WORKOUTS) {
        skippedRows++
        continue
      }
      w = { source_key: key, occurred_on: start.date, title, details: { exercises: [] } }
      const end = iEnd >= 0 ? parseHevyTime(r[iEnd] ?? '') : null
      if (end) {
        const days = (Date.parse(end.date) - Date.parse(start.date)) / 86_400_000
        const duration = days * 1440 + end.minutes - start.minutes
        if (duration > 0 && duration <= 600) w.details.duration_min = duration
      }
      byKey.set(key, w)
    }
    let ex = w.details.exercises.find((e) => e.name === exercise)
    if (!ex) {
      if (w.details.exercises.length >= MAX_EXERCISES) continue
      ex = { name: exercise, sets: [] }
      w.details.exercises.push(ex)
    }
    if (ex.sets.length >= MAX_SETS) continue
    const kg = iKg >= 0 ? num(r[iKg]) : null
    const lbs = kg == null && iLbs >= 0 ? num(r[iLbs]) : null
    ex.sets.push({
      reps: iReps >= 0 ? num(r[iReps]) : null,
      weight_kg: kg ?? (lbs == null ? null : Math.round(lbs * LB_TO_KG * 10) / 10),
    })
  }

  const workouts = [...byKey.values()].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))
  const counts = new Map<string, number>()
  for (const w of workouts) for (const e of w.details.exercises) counts.set(e.name, (counts.get(e.name) ?? 0) + 1)
  return {
    workouts,
    skippedRows,
    from: workouts.at(-1)?.occurred_on ?? null,
    to: workouts[0]?.occurred_on ?? null,
    exercises: [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR')),
  }
}
