// Aba "Acompanhamento" da pessoa: plano, rotina e profissionais num lugar só.

export const ACOMPANHAMENTO_TABS = [
  { to: '/plano', label: 'Plano' },
  { to: '/rotina', label: 'Rotina' },
  { to: '/saude', label: 'Profissionais' },
] as const

const LAST_KEY = 'skyro.acompanhamento.ultima'

/**
 * Onde a aba abre: sem ninguém acompanhando, na busca de profissionais;
 * com vínculo, na última seção aberta (ou no plano).
 */
export function acompanhamentoStart(teamSize: number, last: string | null): string {
  if (teamSize === 0) return '/saude'
  return ACOMPANHAMENTO_TABS.some((t) => t.to === last) ? last! : '/plano'
}

export function readLastSection(): string | null {
  try {
    return localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}

export function rememberSection(to: string) {
  try {
    localStorage.setItem(LAST_KEY, to)
  } catch {
    // sem armazenamento local, a aba abre sempre no plano
  }
}
