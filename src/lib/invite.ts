import type { Role } from './database.types'

// Convite para um desafio: quem abre o link sem estar logado entra (ou cria a
// conta) e cai direto no desafio, em vez da tela inicial.
const KEY = 'skyro-convite'

export function saveInvite(challengeId: string) {
  try {
    localStorage.setItem(KEY, challengeId)
  } catch {
    // sem armazenamento local, a pessoa só cai na tela inicial
  }
}

export function clearInvite() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nada a limpar
  }
}

/** Endereço do desafio dentro da Comunidade de cada tipo de conta (a Equipe não participa). */
export function challengePath(role: Role, challengeId: string): string | null {
  if (role === 'admin') return null
  const base = role === 'professional' ? '/pro/comunidade' : '/comunidade'
  return `${base}?desafio=${encodeURIComponent(challengeId)}`
}

/** Convite guardado antes do login, se houver. */
export function pendingInvitePath(role: Role): string | null {
  try {
    const id = localStorage.getItem(KEY)
    return id ? challengePath(role, id) : null
  } catch {
    return null
  }
}
