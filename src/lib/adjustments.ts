// Pedido de ajuste: o cliente pede uma mudança no plano, o profissional propõe
// e o cliente aceita ou recusa. Os passos e quem pode dar cada um são do banco.

export type AdjustmentKind = 'trocar_dia' | 'aliviar' | 'substituir' | 'outro'
export type AdjustmentStatus = 'aberto' | 'proposto' | 'aceito' | 'recusado' | 'cancelado'

export interface AdjustmentRequest {
  id: string
  person_id: string
  professional_id: string
  kind: AdjustmentKind
  message: string
  status: AdjustmentStatus
  proposal: string | null
  created_at: string
  responded_at: string | null
  decided_at: string | null
}

export const ADJUSTMENT_TEXT_MAX = 500

export const ADJUSTMENT_KINDS: { value: AdjustmentKind; label: string; placeholder: string }[] = [
  { value: 'trocar_dia', label: 'Trocar o dia', placeholder: 'Ex.: na quarta não consigo treinar, dá para mudar o dia?' },
  { value: 'aliviar', label: 'Aliviar a semana', placeholder: 'Ex.: semana corrida, posso fazer menos desta vez?' },
  { value: 'substituir', label: 'Substituir algo', placeholder: 'Ex.: não tenho esse aparelho, o que faço no lugar?' },
  { value: 'outro', label: 'Outro', placeholder: 'Conte o que mudou na sua rotina.' },
]

export function kindLabel(kind: AdjustmentKind): string {
  return ADJUSTMENT_KINDS.find((k) => k.value === kind)?.label ?? 'Outro'
}

/** Como o cliente lê o estado do pedido. */
export function statusForPerson(r: Pick<AdjustmentRequest, 'status'>, proFirstName: string): string {
  switch (r.status) {
    case 'aberto':
      return `Aguardando ${proFirstName}`
    case 'proposto':
      return `${proFirstName} respondeu`
    case 'aceito':
      return 'Ajuste combinado'
    case 'recusado':
      return 'Você recusou a proposta'
    case 'cancelado':
      return 'Pedido cancelado'
  }
}

/** Pedidos em que o cliente ainda tem algo a ver: sem resposta ou com proposta para decidir. */
export function isOngoing(r: Pick<AdjustmentRequest, 'status'>): boolean {
  return r.status === 'aberto' || r.status === 'proposto'
}

/** Fila do profissional: quem espera retorno dele, o mais antigo primeiro. */
export function waitingForPro<T extends Pick<AdjustmentRequest, 'status' | 'created_at'>>(requests: T[]): T[] {
  return requests.filter((r) => r.status === 'aberto').sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/**
 * O que mostrar ao cliente em cada profissional: os pedidos em andamento e o
 * último já decidido (para ele lembrar o que foi combinado).
 */
export function visibleForPerson<T extends Pick<AdjustmentRequest, 'status' | 'created_at'>>(requests: T[]): T[] {
  const recent = [...requests].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const lastSettled = recent.find((r) => r.status === 'aceito' || r.status === 'recusado')
  return recent.filter((r) => isOngoing(r) || r === lastSettled)
}

/** "há 5 h", "há 2 dias": há quanto tempo o pedido espera. */
export function waitingSince(createdAt: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000))
  if (minutes < 60) return 'há menos de 1 h'
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'há 1 dia' : `há ${days} dias`
}
