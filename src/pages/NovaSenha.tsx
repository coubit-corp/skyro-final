import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { homeFor } from '../auth/home'
import { Logo } from '../components/Logo'
import { friendlyError } from '../lib/authErrors'
import { supabase } from '../lib/supabase'

/**
 * Destino do link "Esqueci minha senha". O Supabase abre a sessão de
 * recuperação a partir do link; aqui a pessoa só escolhe a senha nova.
 */
export function NovaSenha() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = { password: useId(), confirm: useId() }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) return setError('As duas senhas não são iguais.')
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(friendlyError(error.message))
    navigate(profile ? homeFor(profile.role) : '/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh items-start justify-center px-4 py-8 sm:items-center">
      <div className="card w-full max-w-sm space-y-4">
        <div className="text-center">
          <Logo size="lg" />
        </div>
        <h1 className="text-lg font-semibold">Criar senha nova</h1>
        {loading ? (
          <p className="text-sm text-muted">Conferindo o link…</p>
        ) : !session ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              Este link expirou ou já foi usado. Peça outro em "Esqueci minha senha", na tela de entrada.
            </p>
            <Link to="/entrar" className="btn-primary w-full">
              Ir para a entrada
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor={ids.password} className="text-sm font-semibold">
                Senha nova
              </label>
              <input
                id={ids.password}
                className="input w-full"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted">Pelo menos 6 caracteres.</p>
            </div>
            <div className="space-y-1">
              <label htmlFor={ids.confirm} className="text-sm font-semibold">
                Repita a senha nova
              </label>
              <input
                id={ids.confirm}
                className="input w-full"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar senha nova'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
