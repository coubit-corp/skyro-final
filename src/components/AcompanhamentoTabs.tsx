import { Link, Navigate, useLocation } from 'react-router-dom'
import { useMyTeam } from '../hooks/usePersonData'
import { ACOMPANHAMENTO_TABS, acompanhamentoStart, readLastSection, rememberSection } from '../lib/acompanhamento'
import { ErrorState, Skeleton } from './ui'

/** Seções da aba Acompanhamento, no topo de Plano, Rotina e Profissionais. */
export function AcompanhamentoTabs() {
  const { pathname } = useLocation()
  return (
    <nav aria-label="Seções do acompanhamento" className="mb-4 flex gap-1 rounded-2xl bg-chip p-1">
      {ACOMPANHAMENTO_TABS.map((t) => {
        const active = pathname === t.to || pathname.startsWith(`${t.to}/`)
        return (
          <Link
            key={t.to}
            to={t.to}
            onClick={() => rememberSection(t.to)}
            aria-current={active ? 'page' : undefined}
            className={`flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-semibold transition ${
              active ? 'bg-card text-primary shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

/** "/acompanhamento": escolhe a seção conforme a pessoa tem ou não quem a acompanhe. */
export function AcompanhamentoRedirect() {
  const team = useMyTeam()
  if (team.error) return <ErrorState message={team.error.message} onRetry={() => team.refetch()} />
  if (!team.data) return <Skeleton className="h-32" />
  return <Navigate to={acompanhamentoStart(team.data.length, readLastSection())} replace />
}
