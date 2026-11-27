// Corrida: leitura de arquivos GPX/TCX (exportados pelo Strava, Garmin e outros),
// ritmo e o plano progressivo. Tudo cálculo puro; quem grava e protege é o banco.

import { addDays, todayBRT } from './dates'
import { isoWeekday } from './plan'

// ---------------------------------------------------------------------------
// Corridas registradas
// ---------------------------------------------------------------------------

export type Sport = 'corrida' | 'caminhada' | 'pedal'
export type RunOrigin = 'gpx' | 'tcx' | 'manual'

export const SPORT_LABEL: Record<Sport, string> = { corrida: 'Corrida', caminhada: 'Caminhada', pedal: 'Pedal' }

export interface RunDetails {
  sport: Sport
  origin: RunOrigin
  distance_km: number
  duration_min: number
  elevation_m?: number
}

export interface ParsedRun {
  occurred_on: string
  title: string
  /** Chave da origem: o horário de início. Importar o mesmo arquivo de novo não duplica. */
  source_key: string
  details: RunDetails
}

export const RUN_FILE_MAX_BYTES = 15 * 1024 * 1024
export const MAX_RUN_FILES = 30

const R = 6371 // raio da Terra em km

function haversine(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b[0] - a[0])
  const dLon = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function round(n: number, places: number): number {
  const f = 10 ** places
  return Math.round(n * f) / f
}

function sportFrom(raw: string | undefined): Sport {
  const t = (raw ?? '').toLowerCase()
  if (/bik|cycl|ride|pedal/.test(t)) return 'pedal'
  if (/walk|hik|caminh/.test(t)) return 'caminhada'
  return 'corrida'
}

function tag(xml: string, name: string): string | undefined {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'i'))
  return m?.[1].trim()
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim()
}

interface Point {
  lat?: number
  lon?: number
  ele?: number
  time?: number
  dist?: number
}

/** Subida acumulada, ignorando oscilações menores que 2 m do GPS. */
function elevationGain(points: Point[]): number | undefined {
  const eles = points.map((p) => p.ele).filter((e): e is number => e != null && Number.isFinite(e))
  if (eles.length < 2) return undefined
  let gain = 0
  let base = eles[0]
  for (const e of eles.slice(1)) {
    if (e - base >= 2) {
      gain += e - base
      base = e
    } else if (e < base) base = e
  }
  return Math.round(gain)
}

function summarize(points: Point[], sport: Sport, origin: RunOrigin, name: string | undefined, distanceKm?: number): ParsedRun | null {
  const times = points.map((p) => p.time).filter((t): t is number => t != null && Number.isFinite(t))
  if (times.length < 2) return null
  const start = Math.min(...times)
  const end = Math.max(...times)
  const durationMin = (end - start) / 60_000
  let km = distanceKm
  if (km == null) {
    km = 0
    let prev: [number, number] | null = null
    for (const p of points) {
      if (p.lat == null || p.lon == null) continue
      const cur: [number, number] = [p.lat, p.lon]
      if (prev) km += haversine(prev, cur)
      prev = cur
    }
  }
  if (durationMin < 1 || km <= 0) return null
  const elevation = elevationGain(points)
  const label = SPORT_LABEL[sport]
  return {
    occurred_on: todayBRT(new Date(start)),
    title: (name ? decode(name) : '').slice(0, 120) || label,
    source_key: new Date(start).toISOString(),
    details: {
      sport,
      origin,
      distance_km: round(Math.min(km, 500), 2),
      duration_min: round(Math.min(durationMin, 1440), 1),
      ...(elevation != null ? { elevation_m: Math.min(elevation, 20000) } : {}),
    },
  }
}

/** Lê um GPX (Strava, Garmin, Nike Run Club via exportadores). Sem pontos com horário: null. */
export function parseGpx(xml: string): ParsedRun | null {
  if (!/<gpx\b/i.test(xml)) return null
  const trk = tag(xml, 'trk') ?? xml
  const points: Point[] = []
  for (const m of trk.matchAll(/<(?:\w+:)?trkpt\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?trkpt>/gi)) {
    const attrs = m[1]
    const lat = Number(attrs.match(/lat="([^"]+)"/)?.[1])
    const lon = Number(attrs.match(/lon="([^"]+)"/)?.[1])
    const ele = tag(m[2], 'ele')
    const time = tag(m[2], 'time')
    points.push({
      lat: Number.isFinite(lat) ? lat : undefined,
      lon: Number.isFinite(lon) ? lon : undefined,
      ele: ele != null ? Number(ele) : undefined,
      time: time ? Date.parse(time) : undefined,
    })
  }
  return summarize(points, sportFrom(tag(trk, 'type')), 'gpx', tag(trk, 'name') ?? tag(xml, 'name'))
}

/** Lê um TCX (Garmin, Strava). Usa a distância do próprio arquivo quando existe. */
export function parseTcx(xml: string): ParsedRun | null {
  if (!/<TrainingCenterDatabase\b/i.test(xml)) return null
  const sport = sportFrom(xml.match(/<Activity\b[^>]*Sport="([^"]+)"/i)?.[1])
  const points: Point[] = []
  let maxDist = 0
  for (const m of xml.matchAll(/<(?:\w+:)?Trackpoint\b[^>]*>([\s\S]*?)<\/(?:\w+:)?Trackpoint>/gi)) {
    const body = m[1]
    const time = tag(body, 'Time')
    const lat = tag(body, 'LatitudeDegrees')
    const lon = tag(body, 'LongitudeDegrees')
    const ele = tag(body, 'AltitudeMeters')
    const dist = tag(body, 'DistanceMeters')
    const p: Point = {
      time: time ? Date.parse(time) : undefined,
      lat: lat != null ? Number(lat) : undefined,
      lon: lon != null ? Number(lon) : undefined,
      ele: ele != null ? Number(ele) : undefined,
    }
    if (dist != null && Number.isFinite(Number(dist))) maxDist = Math.max(maxDist, Number(dist))
    points.push(p)
  }
  const name = tag(xml, 'Notes') ?? tag(xml, 'Name')
  return summarize(points, sport, 'tcx', name, maxDist > 0 ? maxDist / 1000 : undefined)
}

/** Tenta GPX e TCX. Arquivo de outro tipo, sem horário ou com data no futuro: null. */
export function parseRunFile(text: string, todayIso: string): ParsedRun | null {
  const run = parseGpx(text) ?? parseTcx(text)
  if (!run || run.occurred_on > todayIso) return null
  return run
}

/** Corrida registrada à mão: distância em km ("5,2") e duração em minutos ("31" ou "31:30"). */
export function manualRun(
  input: { date: string; distance: string; duration: string; sport: Sport },
  todayIso: string,
): ParsedRun | string {
  const km = Number(input.distance.trim().replace(',', '.'))
  if (!Number.isFinite(km) || km <= 0 || km > 500) return 'Informe a distância em km (ex.: 5 ou 5,2).'
  const d = input.duration.trim()
  const mmss = d.match(/^(\d{1,4}):([0-5]\d)$/)
  const min = mmss ? Number(mmss[1]) + Number(mmss[2]) / 60 : Number(d.replace(',', '.'))
  if (!Number.isFinite(min) || min < 1 || min > 1440) return 'Informe a duração em minutos (ex.: 32 ou 31:30).'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > todayIso) return 'A data não pode ser no futuro.'
  return {
    occurred_on: input.date,
    title: SPORT_LABEL[input.sport],
    source_key: `manual-${input.date}-${Date.now()}`,
    details: { sport: input.sport, origin: 'manual', distance_km: round(km, 2), duration_min: round(min, 1) },
  }
}

/** Ritmo em min/km: "6:05 /km". */
export function paceLabel(d: Pick<RunDetails, 'distance_km' | 'duration_min'>): string {
  if (!d.distance_km) return ''
  const secPerKm = Math.round((d.duration_min * 60) / d.distance_km)
  return `${Math.floor(secPerKm / 60)}:${String(secPerKm % 60).padStart(2, '0')} /km`
}

const km = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/** "5,2 km · 31 min · 6:03 /km · 42 m de subida" */
export function runSummary(d: RunDetails): string {
  return [
    `${km.format(d.distance_km)} km`,
    `${Math.round(d.duration_min)} min`,
    d.sport !== 'pedal' ? paceLabel(d) : '',
    d.elevation_m ? `${d.elevation_m} m de subida` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/** É uma corrida (ou caminhada/pedal) registrada no formato do app? */
export function isRunDetails(d: unknown): d is RunDetails {
  const x = d as Partial<RunDetails> | null
  return Boolean(x && typeof x === 'object' && x.sport && typeof x.distance_km === 'number' && typeof x.duration_min === 'number')
}

// ---------------------------------------------------------------------------
// Plano progressivo
// ---------------------------------------------------------------------------

export type RunGoal = '5k' | '10k' | '21k'
export type RunLevel = 'iniciante' | 'intermediario'

export const GOALS: { value: RunGoal; label: string; km: number; weeks: number }[] = [
  { value: '5k', label: '5 km', km: 5, weeks: 8 },
  { value: '10k', label: '10 km', km: 10, weeks: 10 },
  { value: '21k', label: 'Meia maratona (21 km)', km: 21.1, weeks: 12 },
]

export const LEVELS: { value: RunLevel; label: string; hint: string }[] = [
  { value: 'iniciante', label: 'Começando agora', hint: 'Ainda não corre 20 minutos sem parar.' },
  { value: 'intermediario', label: 'Já corro', hint: 'Corre 30 minutos sem parar.' },
]

export interface RunPlan {
  goal: RunGoal
  days_per_week: number
  level: RunLevel
  starts_on: string
}

export type SessionKind = 'leve' | 'qualidade' | 'longo' | 'prova'

export const EFFORT: Record<SessionKind, string> = {
  leve: 'Leve: dá para conversar (esforço 3 a 4 de 10)',
  qualidade: 'Moderado a forte nos tiros (esforço 6 a 8 de 10)',
  longo: 'Leve e constante (esforço 4 a 5 de 10)',
  prova: 'No seu ritmo: o objetivo é completar',
}

export interface RunSession {
  date: string
  week: number
  kind: SessionKind
  title: string
  minutes: number
  description: string
}

/** Dias da semana (1 = segunda) de cada sessão, com descanso entre elas. */
const DAYS: Record<number, number[]> = { 2: [2, 6], 3: [2, 4, 6], 4: [1, 3, 5, 7] }

function minutesRound(n: number): number {
  return Math.max(10, Math.round(n / 5) * 5)
}

/**
 * Plano progressivo: o treino longo cresce aos poucos até duas semanas antes do
 * objetivo, com uma semana mais leve a cada quatro para recuperar, uma semana de
 * diminuição e, no fim, a prova (ou teste) da distância escolhida.
 */
export function buildRunPlan(plan: RunPlan): RunSession[] {
  const goal = GOALS.find((g) => g.value === plan.goal) ?? GOALS[0]
  const weeks = goal.weeks + (plan.level === 'iniciante' && plan.goal !== '5k' ? 2 : 0)
  const days = DAYS[plan.days_per_week] ?? DAYS[3]
  const startLong = plan.level === 'iniciante' ? 20 : 35
  const peakLong = { '5k': plan.level === 'iniciante' ? 35 : 45, '10k': 70, '21k': 120 }[plan.goal]
  // A semana do plano começa na segunda-feira da data de início.
  const monday = addDays(plan.starts_on, 1 - isoWeekday(plan.starts_on))
  const out: RunSession[] = []

  for (let w = 1; w <= weeks; w++) {
    const build = Math.max(1, weeks - 2)
    const progress = Math.min(1, (w - 1) / Math.max(1, build - 1))
    let long = startLong + (peakLong - startLong) * progress
    // Uma semana mais leve a cada quatro, menos na de pico e nas duas últimas.
    const recovery = w % 4 === 0 && w < build
    if (recovery) long *= 0.8
    if (w === weeks - 1) long *= 0.7
    const longMin = minutesRound(long)
    const easyMin = minutesRound(longMin * 0.6)
    // Iniciante, na primeira metade: corrida intercalada com caminhada.
    const runWalk = plan.level === 'iniciante' && w <= Math.ceil(weeks / 2)
    const runMin = Math.min(8, 1 + Math.floor((w - 1) * 1.5))
    const intervals = Math.min(8, 4 + Math.floor(w / 2))

    days.forEach((wd, i) => {
      const date = addDays(monday, (w - 1) * 7 + wd - 1)
      const last = i === days.length - 1
      if (w === weeks && last) {
        out.push({
          date,
          week: w,
          kind: 'prova',
          title: `Prova ou teste: ${goal.label}`,
          minutes: 0,
          description: `Corra ${goal.label} no seu ritmo. Aqueça 10 minutos caminhando e trotando antes.`,
        })
        return
      }
      if (last) {
        out.push({
          date,
          week: w,
          kind: 'longo',
          title: `Longo: ${longMin} min`,
          minutes: longMin,
          description: runWalk
            ? `Alterne ${runMin} min correndo e 1 min caminhando até completar ${longMin} min.`
            : `${longMin} min em ritmo leve e constante.${recovery ? ' Semana mais leve, para recuperar.' : ''}`,
        })
        return
      }
      // Com 3 ou 4 dias, a segunda sessão da semana é de qualidade (fora as semanas leves e o fim).
      if (i === 1 && plan.days_per_week >= 3 && !recovery && w < weeks - 1 && !runWalk) {
        const tempo = w % 2 === 0
        out.push({
          date,
          week: w,
          kind: 'qualidade',
          title: tempo ? 'Ritmo' : 'Tiros',
          minutes: easyMin + 10,
          description: tempo
            ? `Aqueça 10 min leve, corra ${Math.min(30, 10 + w * 2)} min em ritmo moderado e solte 5 min.`
            : `Aqueça 10 min leve, faça ${intervals}× 2 min forte com 2 min leve entre eles e solte 5 min.`,
        })
        return
      }
      out.push({
        date,
        week: w,
        kind: 'leve',
        title: `Leve: ${easyMin} min`,
        minutes: easyMin,
        description: runWalk
          ? `Alterne ${runMin} min correndo e ${runMin >= 4 ? 1 : 2} min caminhando até completar ${easyMin} min.`
          : `${easyMin} min em ritmo de conversa.`,
      })
    })
  }
  // Começando no meio da semana, as sessões dos dias que já passaram ficam de fora.
  return out.filter((x) => x.date >= plan.starts_on)
}

/** Sessões feitas: há uma corrida registrada no mesmo dia. */
export function planProgress(
  sessions: RunSession[],
  runDates: Set<string>,
  todayIso: string,
): { done: number; due: number; total: number; next: RunSession | null; today: RunSession | null; week: number } {
  const due = sessions.filter((s) => s.date <= todayIso)
  const next = sessions.find((s) => s.date >= todayIso) ?? null
  return {
    done: due.filter((s) => runDates.has(s.date)).length,
    due: due.length,
    total: sessions.length,
    next,
    today: sessions.find((s) => s.date === todayIso) ?? null,
    week: next?.week ?? sessions.at(-1)?.week ?? 1,
  }
}
