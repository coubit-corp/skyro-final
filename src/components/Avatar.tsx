import { useState } from 'react'
import { avatarUrl } from '../lib/supabase'

/**
 * Imagem de perfil. Se a pessoa enviou uma foto, mostra a foto; senão (ou se a
 * foto não carregar), mostra as iniciais do nome.
 */
export function Avatar({
  name,
  size = 48,
  photo,
  src,
}: {
  /** Mantido por compatibilidade com quem passa profiles.avatar_seed */
  seed?: string | null
  name: string
  size?: number
  /** Caminho da foto no bucket (profiles.avatar_path) */
  photo?: string | null
  /** Link direto, para a prévia de uma foto ainda não enviada */
  src?: string | null
}) {
  const url = src ?? avatarUrl(photo)
  const [failed, setFailed] = useState<string | null>(null)
  if (url && failed !== url) {
    return (
      <img
        src={url}
        alt={`Foto de ${name}`}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(url)}
        className="shrink-0 rounded-full bg-lavender-soft object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return <InitialsAvatar name={name} size={size} />
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

function InitialsAvatar({ name, size }: { name: string; size: number }) {
  return (
    <span
      role="img"
      aria-label={`Avatar de ${name}`}
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-chip font-semibold text-ink select-none"
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }}
    >
      {initials(name)}
    </span>
  )
}
