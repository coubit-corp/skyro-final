// Como o painel do profissional separa os pacientes.
// "Sem registro" não é o mesmo que "teve dificuldade": ausência de registro é
// ausência de informação, e não quer dizer que a pessoa deixou de fazer a atividade.

import type { Alert, AlertKind, PatientStatus } from './alerts'
import type { Specialty } from './database.types'
import { toISODate } from './dates'
import { specialtyLabel } from './specialties'

export type PatientGroup = 'atencao' | 'sem_registro' | 'em_dia'

/** Em qual grupo o paciente fica: alerta de rotina, só falta de registro, ou em dia. */
export function groupOf(evaluation: Pick<PatientStatus, 'status' | 'alerts'>): PatientGroup {
  if (evaluation.status !== 'atencao') return 'em_dia'
  return evaluation.alerts.some((a) => a.kind !== 'sem_registro') ? 'atencao' : 'sem_registro'
}

/** Divide a lista nos três grupos, mantendo a ordem em que veio. */
export function groupPatients<T extends { evaluation: Pick<PatientStatus, 'status' | 'alerts'> }>(
  patients: T[],
): Record<PatientGroup, T[]> {
  const groups: Record<PatientGroup, T[]> = { atencao: [], sem_registro: [], em_dia: [] }
  for (const p of patients) groups[groupOf(p.evaluation)].push(p)
  return groups
}

/** Texto do cartão azul do topo: quantos precisam de atenção e quantos só estão sem registro. */
export function attentionSummary(counts: Record<PatientGroup, number>): {
  count: number
  title: string
  subtitle: string
} {
  const { atencao, sem_registro } = counts
  const semRegistro =
    sem_registro === 0
      ? ''
      : sem_registro === 1
        ? '1 paciente sem registro recente'
        : `${sem_registro} pacientes sem registro recente`

  if (atencao === 0) {
    return {
      count: 0,
      title: sem_registro === 0 ? 'Todos os pacientes estão em dia' : 'Nenhum paciente com alerta de rotina',
      subtitle: semRegistro || 'sono, treino e água dentro do esperado',
    }
  }
  return {
    count: atencao,
    title: atencao === 1 ? 'paciente precisa de atenção hoje' : 'pacientes precisam de atenção hoje',
    subtitle: semRegistro
      ? `sono curto, treinos perdidos ou pouca água · ${semRegistro}`
      : 'sono curto, treinos perdidos ou pouca água',
  }
}

export type NextAction = 'conversar' | 'revisar_plano' | 'acompanhar'

export const NEXT_ACTION_LABEL: Record<NextAction, string> = {
  conversar: 'Conversar',
  revisar_plano: 'Revisar plano',
  acompanhar: 'Acompanhar',
}

/**
 * Próxima ação sugerida para o profissional. Treinos perdidos em sequência
 * pedem revisar o plano; sono, água ou falta de registro pedem uma conversa.
 */
export function nextAction(evaluation: Pick<PatientStatus, 'alerts'>): NextAction {
  const kinds = evaluation.alerts.map((a) => a.kind)
  if (kinds.includes('treino')) return 'revisar_plano'
  if (kinds.length > 0) return 'conversar'
  return 'acompanhar'
}

// ---------------------------------------------------------------------------
// Responsável, último contato e última mudança no plano
// ---------------------------------------------------------------------------

/** Outro profissional que acompanha a mesma pessoa (só primeiro nome e área). */
export interface Teammate {
  professionalId: string
  specialty: Specialty
  firstName: string
}

/** Área que cuida de cada tipo de alerta. Sem registro é com quem estiver olhando. */
const AREA_OF: Partial<Record<AlertKind, Specialty>> = {
  treino: 'personal',
  agua: 'nutricionista',
  sono: 'psicologo',
}

/**
 * Quem deve puxar a conversa: na ordem dos alertas, o primeiro cuja área é a de quem
 * está olhando ("você") ou tem alguém da equipe. Se nenhum, quem está olhando.
 */
export function responsibleFor(
  alerts: Pick<Alert, 'kind'>[],
  mySpecialty: Specialty | null | undefined,
  team: Teammate[],
): { label: string; isMe: boolean } | null {
  if (alerts.length === 0) return null
  // Na ordem dos alertas: o primeiro cuja área é a sua ou tem alguém na equipe.
  for (const a of alerts) {
    const area = AREA_OF[a.kind]
    if (!area) continue
    if (area === mySpecialty) return { label: 'Você', isMe: true }
    const mate = team.find((t) => t.specialty === area)
    if (mate) return { label: `${mate.firstName} (${specialtyLabel(area).toLowerCase()})`, isMe: false }
  }
  return { label: 'Você', isMe: true }
}

/** Dias entre um momento (timestamp) e hoje, no fuso do aparelho. */
export function daysAgo(timestamp: string, todayIso: string): number {
  const day = toISODate(new Date(timestamp))
  const [a, b] = [day, todayIso].map((d) => new Date(`${d}T12:00:00`).getTime())
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

/** "hoje", "ontem", "há 5 dias" */
export function agoLabel(timestamp: string, todayIso: string): string {
  const n = daysAgo(timestamp, todayIso)
  return n === 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`
}

/** O mais recente entre vários momentos (ignora vazios). */
export function latest(...timestamps: (string | null | undefined)[]): string | null {
  return timestamps.reduce<string | null>((max, t) => (t && (!max || t > max) ? t : max), null)
}
