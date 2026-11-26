import { MessageSquare } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { PendingAdjustments } from '../../components/Adjustments'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { Logo } from '../../components/Logo'
import { SignOutButton } from '../../components/SignOutButton'
import { ProUnreadBadge } from '../../components/UnreadBadge'
import { ErrorState, Skeleton } from '../../components/ui'
import { useAdjustments } from '../../hooks/useAdjustments'
import { useGreeting } from '../../hooks/useAccount'
import { useProConversations } from '../../hooks/useMessages'
import { usePatients } from '../../hooks/useProData'
import { waitingForPro } from '../../lib/adjustments'
import { unreadLabel } from '../../lib/messages'
import { groupPatients } from '../../lib/patientGroups'
import { PatientCard } from './Pacientes'

/** Porta de entrada do profissional: primeiro quem espera retorno. */
export function Hoje() {
  const { profile } = useAuth()
  const hello = useGreeting(profile?.full_name)
  const patients = usePatients()
  const requests = useAdjustments('professional')
  const conversations = useProConversations()

  const unread = useMemo(() => (conversations.data ?? []).filter((c) => c.unread > 0), [conversations.data])
  const attention = useMemo(() => groupPatients(patients.data ?? []).atencao, [patients.data])
  const waiting = useMemo(() => {
    const ids = new Set((patients.data ?? []).map((p) => p.id))
    return waitingForPro(requests.data ?? []).filter((r) => ids.has(r.person_id)).length
  }, [requests.data, patients.data])

  const loading = patients.isLoading || conversations.isLoading || requests.isLoading
  const pending = waiting + unread.length + attention.length

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between lg:hidden">
        <span className="flex items-center gap-2">
          <Logo />
          <span className="rounded-md bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">PRO</span>
        </span>
        <div className="flex items-center gap-1">
          <Link
            to="/pro/mensagens"
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-lavender-soft hover:text-ink"
            aria-label="Mensagens"
          >
            <MessageSquare className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            <ProUnreadBadge className="absolute -top-0.5 -right-0.5" />
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div>
        <h1 className="text-[28px] leading-tight font-bold">{hello}</h1>
        <p className="text-sm text-muted">
          {loading
            ? 'Carregando seu dia…'
            : pending === 0
              ? 'Ninguém esperando seu retorno agora.'
              : 'Comece por quem espera seu retorno.'}
        </p>
      </div>

      {patients.error ? (
        <ErrorState message={patients.error.message} onRetry={() => patients.refetch()} />
      ) : loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <>
          <PendingAdjustments patients={patients.data!} />

          {unread.length > 0 && (
            <section aria-label="Mensagens não lidas" className="space-y-2">
              <h2 className="eyebrow pt-1">Mensagens não lidas · {unread.length}</h2>
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {unread.map((c) => (
                  <li key={c.otherId} className="min-w-0">
                    <Link
                      to={`/pro/mensagens/${c.otherId}`}
                      className="card flex items-center gap-3 transition hover:ring-2 hover:ring-lavender"
                    >
                      <Avatar seed={c.other.avatar_seed} photo={c.other.avatar_path} name={c.other.full_name} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{c.other.full_name}</p>
                        <p className="text-sm text-muted">{unreadLabel(c.unread)}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-primary">Responder</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {attention.length > 0 && (
            <section aria-label="Precisam de atenção" className="space-y-2">
              <h2 className="eyebrow pt-1">Precisam de atenção · {attention.length}</h2>
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {attention.map((p) => (
                  <PatientCard key={p.id} p={p} />
                ))}
              </ul>
            </section>
          )}

          {pending === 0 && (
            <div className="card text-sm text-muted">
              {patients.data!.length === 0
                ? 'Você ainda não acompanha ninguém. Quando alguém compartilhar a rotina com você, os pedidos e as mensagens aparecem aqui.'
                : 'Sem pedidos de ajuste, mensagens não lidas ou alertas. '}
              {patients.data!.length > 0 && (
                <Link to="/pro/clientes" className="font-semibold text-primary">
                  Ver todos os clientes
                </Link>
              )}
            </div>
          )}
        </>
      )}

      <DemoBanner />
    </section>
  )
}
