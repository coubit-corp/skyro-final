import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { homeFor } from '../auth/home'
import { Logo } from '../components/Logo'
import type { Role } from '../lib/database.types'
import { friendlyError } from '../lib/authErrors'
import { DEMO_ACCOUNTS } from '../lib/demo'
import { pendingInvitePath } from '../lib/invite'
import { supabase } from '../lib/supabase'

type Mode = 'entrar' | 'cadastrar' | 'recuperar'
type Audience = Extract<Role, 'person' | 'professional'>

/** Texto de cada público: a mesma tela atende quem é acompanhado e quem acompanha. */
const COPY: Record<Audience, { tab: string; title: string; text: string; signupNote: string }> = {
  person: {
    tab: 'Para você',
    title: 'Sua rotina acompanhada entre as consultas',
    text: 'Registre como foi o dia e deixe o seu nutricionista, psicólogo ou personal ajustar o plano a tempo.',
    signupNote:
      'Grátis para você. Seus registros só são vistos pelos profissionais que você autorizar, e você pode tirar a autorização quando quiser.',
  },
  professional: {
    tab: 'Para profissionais',
    title: 'Veja quem precisa de atenção hoje',
    text: 'Acompanhe a rotina dos seus clientes entre as consultas e ajuste o plano antes que eles desistam.',
    signupNote:
      'Depois do cadastro, você informa seu registro no conselho (CRN, CRP, CREF ou CREFITO). A equipe Skyro confere antes de o perfil aparecer para as pessoas.',
  },
}

export function Login() {
  const { session, profile } = useAuth()
  const [audience, setAudience] = useState<Audience>('person')
  const [mode, setMode] = useState<Mode>('entrar')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const ids = { name: useId(), email: useId(), password: useId(), hint: useId() }

  if (session && profile) return <Navigate to={pendingInvitePath(profile.role) ?? homeFor(profile.role)} replace />

  const copy = COPY[audience]

  function go(next: Mode) {
    setMode(next)
    setError(null)
    setInfo(null)
  }

  async function signIn(mail: string, pass: string, key: string) {
    setBusy(key)
    setError(null)
    setInfo(null)
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pass })
    if (error) setError(friendlyError(error.message))
    setBusy(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setInfo(null)
    const mail = email.trim()
    if (mode === 'entrar') return signIn(mail, password, 'form')

    setBusy('form')
    setError(null)
    if (mode === 'recuperar') {
      const { error } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: `${window.location.origin}/nova-senha`,
      })
      if (error) setError(friendlyError(error.message))
      else setInfo(`Se ${mail} tiver cadastro, enviamos um link para criar uma senha nova. Confira também o spam.`)
      setBusy(null)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: mail,
      password,
      options: { data: { full_name: fullName.trim(), role: audience } },
    })
    if (error) setError(friendlyError(error.message))
    else if (!data.session)
      setInfo(`Conta criada! Enviamos um link de confirmação para ${mail}. Abra o link e depois entre por aqui.`)
    setBusy(null)
  }

  const demos = audience === 'person' ? (['person', 'professional'] as const) : (['professional', 'person'] as const)

  return (
    <div className="flex min-h-dvh items-start justify-center px-4 py-8 sm:items-center">
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-3 text-center">
          <Logo size="lg" />
          <div
            className="grid grid-cols-2 rounded-2xl bg-lavender-soft p-1"
            role="group"
            aria-label="Quem está entrando"
          >
            {(['person', 'professional'] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={audience === a}
                onClick={() => {
                  setAudience(a)
                  setError(null)
                }}
                className={`min-h-11 rounded-xl text-sm font-semibold transition ${
                  audience === a ? 'bg-card text-ink shadow-sm' : 'text-muted'
                }`}
              >
                {COPY[a].tab}
              </button>
            ))}
          </div>
          <h1 className="font-display text-2xl font-bold leading-tight">{copy.title}</h1>
          <p className="text-sm text-muted">{copy.text}</p>
        </header>

        <section className="card space-y-4">
          {mode === 'recuperar' ? (
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Recuperar senha</h2>
              <p className="text-sm text-muted">Informe o e-mail da conta. Enviamos um link para você criar uma senha nova.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 border-b border-line" role="tablist" aria-label="Entrar ou criar conta">
              {(['entrar', 'cadastrar'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => go(m)}
                  className={`-mb-px min-h-11 border-b-2 text-sm font-semibold transition ${
                    mode === m ? 'border-primary text-ink' : 'border-transparent text-muted'
                  }`}
                >
                  {m === 'entrar' ? 'Entrar' : 'Criar conta'}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'cadastrar' && (
              <Field id={ids.name} label={audience === 'professional' ? 'Nome profissional' : 'Seu nome'}>
                <input
                  id={ids.name}
                  className="input w-full"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </Field>
            )}
            <Field id={ids.email} label="E-mail">
              <input
                id={ids.email}
                className="input w-full"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="voce@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            {mode !== 'recuperar' && (
              <Field
                id={ids.password}
                label="Senha"
                action={
                  mode === 'entrar' && (
                    <button type="button" className="text-xs font-semibold text-primary" onClick={() => go('recuperar')}>
                      Esqueci minha senha
                    </button>
                  )
                }
              >
                <div className="relative">
                  <input
                    id={ids.password}
                    className="input w-full pr-12"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
                    minLength={6}
                    required
                    aria-describedby={mode === 'cadastrar' ? ids.hint : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-ink"
                    aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
                {mode === 'cadastrar' && (
                  <p id={ids.hint} className="text-xs text-muted">
                    Pelo menos 6 caracteres.
                  </p>
                )}
              </Field>
            )}

            {mode === 'cadastrar' && <p className="rounded-xl bg-surface px-3 py-2 text-xs text-muted">{copy.signupNote}</p>}

            {error && (
              <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
                {error}
              </p>
            )}
            {info && (
              <p role="status" className="rounded-xl bg-lavender-soft px-3 py-2 text-sm text-primary">
                {info}
              </p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={busy !== null}>
              {busy === 'form'
                ? 'Aguarde…'
                : mode === 'entrar'
                  ? 'Entrar'
                  : mode === 'recuperar'
                    ? 'Enviar link'
                    : audience === 'professional'
                      ? 'Criar conta profissional'
                      : 'Criar minha conta'}
            </button>
            {mode === 'recuperar' && (
              <button type="button" className="w-full text-sm font-semibold text-muted hover:text-ink" onClick={() => go('entrar')}>
                Voltar para entrar
              </button>
            )}
          </form>
        </section>

        <section className="space-y-2" aria-labelledby="demo-title">
          <p id="demo-title" className="eyebrow text-center">
            Só quer conhecer? Entre sem cadastro
          </p>
          {demos.map((k) => {
            const acc = DEMO_ACCOUNTS[k]
            return (
              <button
                key={k}
                type="button"
                className="btn-outline flex w-full flex-col items-center gap-0.5 py-3"
                disabled={busy !== null}
                onClick={() => signIn(acc.email, acc.password, k)}
              >
                <span>{busy === k ? 'Entrando…' : acc.label}</span>
                <span className="text-xs font-normal text-muted">{acc.who}</span>
              </button>
            )
          })}
          <button
            type="button"
            className="w-full py-2 text-xs font-semibold text-muted hover:text-ink"
            disabled={busy !== null}
            onClick={() => signIn(DEMO_ACCOUNTS.team.email, DEMO_ACCOUNTS.team.password, 'team')}
          >
            {busy === 'team' ? 'Entrando…' : `${DEMO_ACCOUNTS.team.label}: ${DEMO_ACCOUNTS.team.who.toLowerCase()}`}
          </button>
          <p className="text-center text-xs text-muted">Contas de demonstração com dados fictícios.</p>
        </section>
      </div>
    </div>
  )
}

function Field({ id, label, action, children }: { id: string; label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}
