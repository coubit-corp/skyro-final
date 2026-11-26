import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { Rating } from '../../components/ProCard'
import { ChipTabs, ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { useOffers } from '../../hooks/useOffers'
import { useProfessionals } from '../../hooks/usePersonData'
import type { Specialty } from '../../lib/database.types'
import { MAX_COMPARE, OFFER_ROWS, parseCompareIds, toggleCompare } from '../../lib/offers'
import { MODALITY_LABEL, SPECIALTIES } from '../../lib/specialties'

const COLS = ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3']

/** Skyro Compare: até 3 profissionais da mesma área, lado a lado, nos mesmos critérios. */
export function Comparar() {
  const [params, setParams] = useSearchParams()
  const pros = useProfessionals()
  const offers = useOffers()

  const withOffer = useMemo(
    () =>
      (pros.data ?? [])
        // Recusado continua visível para quem já teve vínculo, mas não entra como opção de escolha.
        .filter((p) => !p.rejection_reason && offers.data?.has(p.id))
        .sort((a, b) => a.profiles.full_name.localeCompare(b.profiles.full_name, 'pt-BR')),
    [pros.data, offers.data],
  )
  const asked = params.get('especialidade') as Specialty | null
  const fromIds = withOffer.find((p) => (params.get('ids') ?? '').split(',').includes(p.id))?.specialty
  const specialty: Specialty =
    (SPECIALTIES.some((s) => s.value === asked) ? asked : null) ?? fromIds ?? withOffer[0]?.specialty ?? 'personal'
  const options = withOffer.filter((p) => p.specialty === specialty)
  const ids = options.map((p) => p.id)
  // Sem escolha na URL, começa com os primeiros da área.
  const selected = params.has('ids') ? parseCompareIds(params.get('ids'), ids) : ids.slice(0, MAX_COMPARE)
  const columns = selected.map((id) => options.find((p) => p.id === id)!)

  const update = (next: { especialidade: Specialty; ids?: string[] }) =>
    setParams(
      { especialidade: next.especialidade, ...(next.ids ? { ids: next.ids.join(',') } : {}) },
      { replace: true },
    )

  const loading = pros.isLoading || offers.isLoading
  const error = pros.error ?? offers.error

  return (
    <section className="space-y-4">
      <PageHeader
        title="Comparar acompanhamentos"
        back={{ to: '/saude/perto', label: 'Perto de você' }}
        subtitle="O que cada profissional inclui na mensalidade, nos mesmos critérios."
      />

      <ChipTabs<Specialty>
        label="Especialidade"
        value={specialty}
        onChange={(v) => update({ especialidade: v })}
        options={SPECIALTIES.map((s) => ({ value: s.value, label: s.label }))}
      />

      {loading ? (
        <Skeleton className="h-72" />
      ) : error ? (
        <ErrorState message={error.message} onRetry={() => (pros.error ? pros.refetch() : offers.refetch())} />
      ) : options.length === 0 ? (
        <p className="card text-sm text-muted">
          {offers.data
            ? 'Nenhum profissional desta área informou como funciona o acompanhamento ainda.'
            : 'A comparação ainda não está disponível.'}
        </p>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm text-muted">Escolha até {MAX_COMPARE} para comparar:</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Profissionais na comparação">
              {options.map((p) => {
                const on = selected.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={on}
                    disabled={!on && selected.length >= MAX_COMPARE}
                    onClick={() => update({ especialidade: specialty, ids: toggleCompare(selected, p.id) })}
                    className={`min-h-11 rounded-full border px-3 text-sm font-semibold disabled:opacity-40 ${
                      on ? 'border-primary bg-primary text-white' : 'border-line bg-card text-ink'
                    }`}
                  >
                    {p.profiles.full_name}
                  </button>
                )
              })}
            </div>
          </div>

          {columns.length === 0 ? (
            <p className="card text-sm text-muted">Escolha pelo menos um profissional acima.</p>
          ) : (
            <div className="card space-y-4">
              <div className={`grid gap-3 ${COLS[columns.length]}`}>
                {columns.map((p) => (
                  <div key={p.id} className="flex min-w-0 flex-col items-center gap-1 text-center">
                    <Avatar seed={p.profiles.avatar_seed} photo={p.profiles.avatar_path} name={p.profiles.full_name} size={48} />
                    <p className="text-sm font-semibold break-words">{p.profiles.full_name}</p>
                    <Rating rating={p.rating} count={p.reviews_count} />
                  </div>
                ))}
              </div>
              {[
                ...OFFER_ROWS.map((row) => ({ label: row.label, cells: columns.map((p) => row.value(offers.data!.get(p.id)!)) })),
                { label: 'Atendimento', cells: columns.map((p) => MODALITY_LABEL[p.modality]) },
              ].map((row) => (
                <div key={row.label} className="space-y-1 border-t border-line pt-3">
                  <p className="eyebrow">{row.label}</p>
                  <div className={`grid gap-3 ${COLS[columns.length]}`}>
                    {row.cells.map((cell, i) => (
                      <p key={columns[i].id} className="min-w-0 text-center text-sm font-semibold break-words">
                        <span className="sr-only">{columns[i].profiles.full_name}: </span>
                        {cell}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              <div className={`grid gap-3 border-t border-line pt-4 ${COLS[columns.length]}`}>
                {columns.map((p) => (
                  <Link key={p.id} to={`/saude/profissional/${p.id}`} className="btn-primary min-w-0 px-2 text-center">
                    Escolher<span className="sr-only"> {p.profiles.full_name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <p className="text-center text-xs text-muted">
            "Escolher" abre o perfil. Você só fecha o acompanhamento quando compartilhar sua rotina lá.
          </p>
        </>
      )}
      <DemoBanner />
    </section>
  )
}
