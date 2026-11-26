import { Link } from 'react-router-dom'
import { DemoBanner } from '../../components/DemoBanner'
import { ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { useMyProfessional } from '../../hooks/useProData'
import { todayBRT } from '../../lib/dates'
import { DAY_NAMES, type Availability } from '../../lib/profile'
import { weekdayNumber } from '../../lib/agenda'

/** Semana de atendimento do profissional, com o dia de hoje em destaque. */
export function Agenda() {
  const me = useMyProfessional()
  const today = weekdayNumber(todayBRT())

  if (me.error) return <ErrorState message={me.error.message} onRetry={() => me.refetch()} />

  const availability = (me.data?.availability ?? {}) as Availability
  const hasHours = Object.values(availability).some(Boolean)

  return (
    <section className="space-y-4">
      <PageHeader title="Agenda" subtitle="Seus horários de atendimento na semana." />

      {me.isLoading ? (
        <Skeleton className="h-72" />
      ) : (
        <div className="card">
          <ul className="divide-y divide-line">
            {DAY_NAMES.map((name, i) => {
              const range = availability[String(i + 1)]
              const isToday = i + 1 === today
              return (
                <li key={name} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className={isToday ? 'font-semibold' : 'text-muted'}>
                    {name}
                    {isToday && <span className="ml-2 rounded-full bg-chip px-2 py-0.5 text-xs font-semibold">Hoje</span>}
                  </span>
                  <span className={range ? 'font-semibold' : 'text-muted'}>
                    {range ? `${range[0]} às ${range[1]}` : 'Sem atendimento'}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {!me.isLoading && (
        <Link to="/pro/configuracoes" className="btn-outline w-full sm:w-auto">
          {hasHours ? 'Editar horários no perfil' : 'Definir horários no perfil'}
        </Link>
      )}
      <p className="text-xs text-muted">
        Marcar consultas e reservar tempo de revisão pela Skyro ainda não está disponível. Por enquanto, combine o
        horário por mensagem.
      </p>

      <DemoBanner />
    </section>
  )
}
