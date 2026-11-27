// Treino adaptado ao dia: "Tenho 20 minutos", "Estou sem equipamento" e
// "Hoje está difícil". Cálculo puro: a tela mostra a versão adaptada e a pessoa
// registra qual versão fez. O profissional escolhe quais opções a pessoa pode usar.

import { exerciseEquipment, findCatalogExercise, type Muscle, type Routine } from './workouts'

export type Adaptation = 'curto' | 'sem_equipamento' | 'leve'

export const ADAPTATIONS: { value: Adaptation; label: string; hint: string }[] = [
  { value: 'curto', label: 'Tenho 20 minutos', hint: 'Os primeiros exercícios, até caber em uns 20 minutos.' },
  { value: 'sem_equipamento', label: 'Estou sem equipamento', hint: 'Troca o que usa aparelho por um exercício com o peso do corpo.' },
  { value: 'leve', label: 'Hoje está difícil', hint: 'Metade das séries, com carga mais leve. Melhor um treino leve do que faltar.' },
]

export const ALL_ADAPTATIONS: Adaptation[] = ADAPTATIONS.map((a) => a.value)

export function adaptationLabel(a: Adaptation | null | undefined): string | null {
  return ADAPTATIONS.find((x) => x.value === a)?.label ?? null
}

export function isAdaptation(v: unknown): v is Adaptation {
  return typeof v === 'string' && (ALL_ADAPTATIONS as string[]).includes(v)
}

/** Um exercício do treino, venha do plano do personal ou de um treino montado pela pessoa. */
export interface AdaptableExercise {
  name: string
  sets: number
  reps: string
  /** Descanso entre séries, em segundos. Sem informação: 60 s. */
  restSec?: number
  /** Carga combinada ("20 kg"). */
  load?: string | null
}

export interface AdaptedExercise extends AdaptableExercise {
  /** Nome original, quando foi trocado por outro exercício. */
  replaces?: string
  /** Fica de fora hoje (não cabe no tempo ou não tem substituto sem equipamento). */
  skipped?: boolean
  /** Observação curta para a pessoa ("carga mais leve"). */
  tip?: string
}

/** Minutos que cabem no "Tenho 20 minutos". */
export const SHORT_MINUTES = 20
/** Tempo médio de uma série (sem o descanso), em segundos. */
const SET_SECONDS = 45

/** Substituto com o peso do corpo para cada músculo principal. */
const BODYWEIGHT: Partial<Record<Muscle, { name: string; reps: string }>> = {
  peito: { name: 'Flexão de braço', reps: '8-12' },
  costas: { name: 'Superman', reps: '12' },
  ombros: { name: 'Flexão pike', reps: '6-10' },
  triceps: { name: 'Tríceps no banco', reps: '10-12' },
  quadriceps: { name: 'Agachamento (peso do corpo)', reps: '15' },
  posteriores: { name: 'Elevação pélvica (peso do corpo)', reps: '15' },
  gluteos: { name: 'Elevação pélvica (peso do corpo)', reps: '15' },
  panturrilhas: { name: 'Panturrilha em pé (peso do corpo)', reps: '20' },
  abdomen: { name: 'Prancha', reps: '30 s' },
  cardio: { name: 'Polichinelo', reps: '1 min' },
}

/** Segundos estimados de um exercício: séries mais os descansos entre elas. */
export function estimateSeconds(e: Pick<AdaptableExercise, 'sets' | 'restSec'>): number {
  const sets = Math.max(1, e.sets)
  return sets * SET_SECONDS + (sets - 1) * (e.restSec ?? 60)
}

export function adaptWorkout(exercises: AdaptableExercise[], mode: Adaptation | null): AdaptedExercise[] {
  if (!mode) return exercises.map((e) => ({ ...e }))

  if (mode === 'leve') {
    return exercises.map((e) => ({
      ...e,
      sets: Math.max(1, Math.ceil(e.sets / 2)),
      tip: e.load ? 'carga mais leve que a combinada' : 'ritmo tranquilo',
    }))
  }

  if (mode === 'curto') {
    let left = SHORT_MINUTES * 60
    return exercises.map((e, i) => {
      if (left <= 0) return { ...e, skipped: true }
      let sets = Math.max(1, e.sets)
      // Tira séries até caber; o primeiro exercício sempre fica, nem que seja com uma série.
      while (sets > 1 && estimateSeconds({ ...e, sets }) > left) sets--
      const need = estimateSeconds({ ...e, sets })
      if (need > left && i > 0) return { ...e, skipped: true }
      left -= need + (e.restSec ?? 60)
      return sets === e.sets ? { ...e } : { ...e, sets, tip: `${sets} de ${e.sets} séries` }
    })
  }

  // sem_equipamento
  const used = new Set<string>()
  return exercises.map((e) => {
    if (exerciseEquipment(e.name) === 'peso_corporal') return { ...e }
    const muscle = findCatalogExercise(e.name)?.muscle
    const sub = muscle ? BODYWEIGHT[muscle] : undefined
    if (!sub) return { ...e, skipped: true, tip: 'sem substituto sem equipamento' }
    // O mesmo substituto duas vezes vira uma série a mais, não um exercício repetido.
    if (used.has(sub.name)) return { ...e, skipped: true, tip: `já coberto por ${sub.name}` }
    used.add(sub.name)
    return { name: sub.name, sets: e.sets, reps: sub.reps, restSec: e.restSec, replaces: e.name, load: null }
  })
}

/** Quantos minutos o treino adaptado deve levar (só o que não foi pulado). */
export function adaptedMinutes(list: AdaptedExercise[]): number {
  const active = list.filter((e) => !e.skipped)
  const secs = active.reduce((sum, e) => sum + estimateSeconds(e) + (e.restSec ?? 60), 0)
  return Math.max(1, Math.round(secs / 60))
}

/** Treino montado pela pessoa na versão do dia, pronto para começar. Sem adaptação, devolve o mesmo. */
export function adaptRoutine(routine: Routine, mode: Adaptation | null): Routine {
  if (!mode) return routine
  const adapted = adaptWorkout(
    routine.exercises.map((e) => ({ name: e.name, sets: e.sets, reps: e.reps, restSec: e.rest_sec })),
    mode,
  )
  const exercises = routine.exercises.flatMap((e, i) => {
    const a = adapted[i]
    if (a.skipped) return []
    if (!a.replaces) return [{ ...e, sets: a.sets }]
    // Trocado: o substituto é da lista (tem vídeo próprio), então não leva o vídeo do original.
    const { video: _video, ...rest } = e
    void _video
    return [{ ...rest, name: a.name, muscle: findCatalogExercise(a.name)?.muscle ?? e.muscle, sets: a.sets, reps: a.reps }]
  })
  return { ...routine, name: `${routine.name} · ${adaptationLabel(mode)}`, exercises }
}
