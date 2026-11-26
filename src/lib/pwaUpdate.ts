/** Campos onde a pessoa digita texto livre (mensagens, posts, comentários, formulários). */
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'password', ''])

export interface FieldLike {
  tagName: string
  type?: string
  value: string
}

/** Tem texto digitado na tela? Nesse caso, a versão nova espera para não apagar o rascunho. */
export function hasUnsavedText(fields: Iterable<FieldLike>): boolean {
  for (const f of fields) {
    const tag = f.tagName.toUpperCase()
    const isText = tag === 'TEXTAREA' || (tag === 'INPUT' && TEXT_INPUT_TYPES.has((f.type ?? '').toLowerCase()))
    if (isText && f.value.trim() !== '') return true
  }
  return false
}
