import { AcompanhamentoTabs } from '../../components/AcompanhamentoTabs'
import { CalendarDays, PlayCircle, Search } from 'lucide-react'
import { useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdjustmentCard } from '../../components/Adjustments'
import { Avatar } from '../../components/Avatar'
import { DemoBanner } from '../../components/DemoBanner'
import { MyWorkouts } from '../../components/MyWorkouts'
import { CheckButton, ErrorState, PageHeader, Skeleton } from '../../components/ui'
import {
  adaptationsFor,
  useMyPlan,
  useSetPain,
  useSetPlanCheck,
  type MyPlan,
  type PersonPlanItem,
  type TodayCheck,
} from '../../hooks/usePlanData'
import { ADAPTATIONS, adaptationLabel, adaptWorkout, type AdaptedExercise, type Adaptation } from '../../lib/adaptation'
import type { PlanOutcome } from '../../lib/database.types'
import { exercisePath } from '../../lib/workouts'
import { today } from '../../lib/dates'
import {
  CHECK_NOTE_MAX,
  dayHeadline,
  itemDetail,
  OUTCOME_LABEL,
  itemsForDay,
  PAIN_LEVELS,
  PLAN_TABS,
  weekdaysLabel,
  plannedFirst,
} from '../../lib/plan'
import { SPECIALTIES } from '../../lib/specialties'

type TabInfo = (typeof PLAN_TABS)[number]

export function Plano() {
  const plan = useMyPlan()
  const [params, setParams] = useSearchParams()
  const current = PLAN_TABS.find((t) => t.tab === params.get('aba')) ?? PLAN_TABS[0]
  // Sem personal na equipe: o treino que a pessoa monta vem primeiro, e a busca por um profissional depois.
  const solo = Boolean(plan.data) && prosOfTab(current, plan.data!).length === 0
  const tabsId = useId()

  return (
    <section className="space-y-4">
      <AcompanhamentoTabs />
      <PageHeader title="Meu plano" subtitle="Tudo o que sua equipe preparou, num lugar só." />

      <div role="tablist" aria-label="Áreas do plano" className="grid grid-cols-4 gap-1 rounded-2xl bg-lavender-soft p-1">
        {PLAN_TABS.map((t) => (
          <button
            key={t.tab}
            role="tab"
            id={`${tabsId}-${t.tab}`}
            aria-selected={t.tab === current.tab}
            aria-controls={`${tabsId}-painel`}
            onClick={() => setParams(t.tab === 'treino' ? {} : { aba: t.tab }, { replace: true })}
            className={`min-h-11 rounded-xl px-1 text-sm font-semibold transition ${
              t.tab === current.tab ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${tabsId}-painel`} aria-labelledby={`${tabsId}-${current.tab}`} className="space-y-4">
        {current.tab === 'treino' && solo && <MyWorkouts />}
        {plan.isLoading ? (
          <>
            <Skeleton className="h-36" />
            <Skeleton className="h-48" />
          </>
        ) : plan.error ? (
          <ErrorState message={plan.error.message} onRetry={() => plan.refetch()} />
        ) : (
          <TabContent tab={current} plan={plan.data!} />
        )}
        {current.tab === 'treino' && !solo && <MyWorkouts />}
      </div>

      <DemoBanner />
    </section>
  )
}

/** Profissionais desta área: os da equipe (ativos) e os antigos que deixaram plano. */
function prosOfTab(tab: TabInfo, plan: MyPlan) {
  const ids = new Set<string>()
  for (const [proId, s] of plan.shares) {
    if (s.professionals.specialty === tab.specialty && !s.revoked_at) ids.add(proId)
  }
  for (const i of plan.items) if (i.kind === tab.kind) ids.add(i.professional_id)
  // Quem já montou plano aparece antes de quem ainda não montou
  return plannedFirst([...ids], (id) => plan.items.some((i) => i.professional_id === id && i.kind === tab.kind))
}

function TabContent({ tab, plan }: { tab: TabInfo; plan: MyPlan }) {
  const pros = prosOfTab(tab, plan)
  if (pros.length === 0) {
    const plural = SPECIALTIES.find((s) => s.value === tab.specialty)!.plural.toLowerCase()
    return (
      <div className="card space-y-3 text-sm">
        <p className="font-semibold">Você ainda não tem {plural} na sua equipe.</p>
        <p className="text-muted">
          Quando um profissional acompanha sua rotina, o plano que ele montar para você aparece aqui.
        </p>
        <Link to={`/saude/perto?especialidade=${tab.specialty}`} className="btn-outline w-full sm:w-auto">
          <Search className="h-4 w-4" aria-hidden="true" /> Encontrar no Perto de você
        </Link>
      </div>
    )
  }
  const hasItems = (id: string) => plan.items.some((i) => i.professional_id === id && i.kind === tab.kind)
  const waiting = pros.filter((id) => !hasItems(id))
  return (
    <>
      {pros.filter(hasItems).map((proId) => (
        <ProPlan key={proId} tab={tab} proId={proId} plan={plan} />
      ))}
      {waiting.length > 0 && <WaitingPros proIds={waiting} plan={plan} />}
    </>
  )
}

/** Profissionais que ainda não montaram o plano: um cartão compacto no fim, sem ocupar o lugar dos planos prontos. */
function WaitingPros({ proIds, plan }: { proIds: string[]; plan: MyPlan }) {
  return (
    <section className="card space-y-3" aria-label="Aguardando seu profissional">
      <h2 className="eyebrow">Aguardando seu profissional</h2>
      <ul className="space-y-2">
        {proIds.map((id) => {
          const pro = plan.shares.get(id)?.professionals
          const name = pro?.profiles.full_name ?? 'Seu profissional'
          const first = name.split(' ')[0]
          const note = plan.notes.find((n) => n.professional_id === id)
          return (
            <li key={id} className="flex items-start gap-3">
              <Avatar seed={pro?.profiles.avatar_seed} photo={pro?.profiles.avatar_path} name={name} size={36} />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{first} ainda não montou seu plano</p>
                {note && <p className="text-muted">Recado: {note.note}</p>}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function ProPlan({ tab, proId, plan }: { tab: TabInfo; proId: string; plan: MyPlan }) {
  const todayIso = today()
  const share = plan.shares.get(proId)
  const items = plan.items.filter((i) => i.professional_id === proId && i.kind === tab.kind)
  const author = items[0]?.professionals ?? share?.professionals
  const name = author?.profiles.full_name ?? 'Seu profissional'
  const first = name.split(' ')[0]
  const ended = !share || Boolean(share.revoked_at)
  const note = plan.notes.find((n) => n.professional_id === proId)
  const todayItems = itemsForDay(items, todayIso)

  return (
    <article className="space-y-3" aria-label={`Plano de ${name}`}>
      <div className="rounded-card bg-navy p-5 text-white">
        <div className="flex items-center gap-3">
          <Avatar seed={author?.profiles.avatar_seed} photo={author?.profiles.avatar_path} name={name} size={40} />
          <p className="eyebrow text-lavender">
            {tab.area} · {first}
          </p>
        </div>
        <h2 className="mt-3 text-2xl font-bold">{dayHeadline(tab.kind, todayItems)}</h2>
        {note && (
          <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm leading-relaxed">
            <span className="font-semibold">Recado de {first}:</span> {note.note}
          </p>
        )}
        {ended && (
          <p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm">
            Acompanhamento encerrado: {first} não vê mais sua rotina. O plano fica aqui para você consultar.
          </p>
        )}
      </div>

      {tab.kind === 'fisio' && !ended && <PainCard value={plan.painToday} />}

      {items.length === 0 ? (
        <p className="card text-sm text-muted">{first} ainda não montou seu plano.</p>
      ) : (
        <>
          {todayItems.length > 0 ? (
            tab.kind === 'treino' ? (
              <AdaptableWorkout
                items={todayItems}
                checks={plan.checksToday}
                options={ended ? [] : adaptationsFor(plan, proId)}
                readOnly={ended}
              />
            ) : (
              <ul className="card divide-y divide-line py-1">
                {todayItems.map((i) => (
                  <PlanRow key={i.id} item={i} check={plan.checksToday.get(i.id)} readOnly={ended} />
                ))}
              </ul>
            )
          ) : (
            <p className="card text-sm text-muted">Hoje é dia de descanso nesta área.</p>
          )}
          <WeekList items={items} />
        </>
      )}
      {!ended && <AdjustmentCard proId={proId} proName={name} />}
    </article>
  )
}

function PlanRow({ item, check, readOnly }: { item: PersonPlanItem; check?: TodayCheck; readOnly: boolean }) {
  if (item.kind === 'refeicao') return <MealRow item={item} check={check} readOnly={readOnly} />
  return <CheckRow item={item} done={Boolean(check)} readOnly={readOnly} />
}

const OUTCOMES: PlanOutcome[] = ['feito', 'substituido', 'nao_consegui']

/** Refeição: registra o que a pessoa realmente comeu, não só "feito". */
function MealRow({ item, check, readOnly }: { item: PersonPlanItem; check?: TodayCheck; readOnly: boolean }) {
  const save = useSetPlanCheck()
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState(check?.note ?? '')
  const noteId = useId()
  const detail = itemDetail(item)
  const outcome = check?.outcome ?? null

  function choose(next: PlanOutcome) {
    if (next === outcome) {
      save.mutate({ itemId: item.id, outcome: null })
      setNoteOpen(false)
      setNote('')
      return
    }
    save.mutate({ itemId: item.id, outcome: next, note: next === 'feito' ? null : note })
    setNoteOpen(next !== 'feito')
  }

  return (
    <li className="space-y-2 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{item.title}</p>
        {detail && <p className="text-sm text-muted">{detail}</p>}
        {item.notes && <p className="text-xs text-muted">{item.notes}</p>}
      </div>
      {readOnly ? (
        outcome && <p className="text-sm text-muted">Hoje: {OUTCOME_LABEL[outcome]}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={`${item.title}: como foi hoje`}>
            {OUTCOMES.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={outcome === o}
                disabled={save.isPending}
                onClick={() => choose(o)}
                className={`min-h-11 rounded-full px-3 text-sm font-semibold ${
                  outcome === o ? 'bg-primary text-white' : 'bg-chip text-ink'
                }`}
              >
                {OUTCOME_LABEL[o]}
              </button>
            ))}
          </div>
          {outcome && outcome !== 'feito' && !noteOpen && check?.note && (
            <p className="text-sm text-muted">
              “{check.note}”{' '}
              <button type="button" className="font-semibold text-primary" onClick={() => setNoteOpen(true)}>
                Editar
              </button>
            </p>
          )}
          {outcome && outcome !== 'feito' && (noteOpen || !check?.note) && (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                save.mutate({ itemId: item.id, outcome, note })
                setNoteOpen(false)
              }}
            >
              <label htmlFor={noteId} className="sr-only">
                {outcome === 'substituido' ? 'O que você comeu no lugar' : 'O que aconteceu'}
              </label>
              <input
                id={noteId}
                className="input min-w-0 flex-1"
                maxLength={CHECK_NOTE_MAX}
                placeholder={outcome === 'substituido' ? 'O que você comeu no lugar? (opcional)' : 'O que aconteceu? (opcional)'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button type="submit" className="btn-outline shrink-0 px-4" disabled={save.isPending}>
                Salvar
              </button>
            </form>
          )}
        </>
      )}
    </li>
  )
}

/**
 * Treino do dia com a escolha de versão: normal, "Tenho 20 minutos", "Estou sem
 * equipamento" ou "Hoje está difícil", dentro das opções que o personal liberou.
 */
function AdaptableWorkout({
  items,
  checks,
  options,
  readOnly,
}: {
  items: PersonPlanItem[]
  checks: Map<string, TodayCheck>
  options: Adaptation[]
  readOnly: boolean
}) {
  // Se a pessoa já marcou algum item numa versão hoje, a tela abre nela.
  const saved = items.map((i) => checks.get(i.id)?.adaptation).find(Boolean) ?? null
  const [mode, setMode] = useState<Adaptation | null>(saved && options.includes(saved) ? saved : null)
  const adapted = adaptWorkout(
    items.map((i) => ({ name: i.title, sets: i.sets ?? 1, reps: i.reps ?? '', load: i.load })),
    mode,
  )
  const choices = ADAPTATIONS.filter((a) => options.includes(a.value))

  return (
    <div className="space-y-3">
      {choices.length > 0 && (
        <div className="card space-y-2">
          <p className="text-sm font-semibold">Como está seu dia?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Versão do treino de hoje">
            {[{ value: null, label: 'Treino normal' } as const, ...choices].map((c) => (
              <button
                key={c.value ?? 'normal'}
                type="button"
                aria-pressed={mode === c.value}
                onClick={() => setMode(c.value)}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold transition ${
                  mode === c.value ? 'bg-primary text-white' : 'bg-chip text-ink hover:bg-line'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {mode && <p className="text-xs text-muted">{ADAPTATIONS.find((a) => a.value === mode)?.hint}</p>}
        </div>
      )}
      <ul className="card divide-y divide-line py-1">
        {items.map((i, n) => (
          <CheckRow
            key={i.id}
            item={i}
            done={Boolean(checks.get(i.id))}
            doneAs={checks.get(i.id)?.adaptation ?? null}
            readOnly={readOnly}
            view={mode ? adapted[n] : undefined}
            adaptation={mode}
          />
        ))}
      </ul>
    </div>
  )
}

function CheckRow({
  item,
  done,
  readOnly,
  view,
  adaptation = null,
  doneAs = null,
}: {
  item: PersonPlanItem
  done: boolean
  readOnly: boolean
  /** Versão adaptada do item, quando a pessoa escolheu uma. */
  view?: AdaptedExercise
  adaptation?: Adaptation | null
  /** Versão com que o item já foi marcado hoje. */
  doneAs?: Adaptation | null
}) {
  const toggle = useSetPlanCheck()
  if (view?.skipped) {
    return (
      <li className="flex items-center gap-3 py-3 text-muted">
        <span className="h-11 w-11 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold line-through">{item.title}</p>
          <p className="text-xs">Fica de fora hoje{view.tip ? ` (${view.tip})` : ''}.</p>
        </div>
      </li>
    )
  }
  const title = view?.name ?? item.title
  const detail = view
    ? [`${view.sets} × ${view.reps}`.trim(), view.load, view.tip].filter(Boolean).join(' · ')
    : itemDetail(item)
  const doneLabel = done && doneAs ? adaptationLabel(doneAs) : null
  return (
    <li className="flex items-center gap-3 py-3">
      {readOnly ? (
        <span className="h-6 w-6 shrink-0" aria-hidden="true" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center">
          <CheckButton
            checked={done}
            label={`${title}: feito hoje`}
            disabled={toggle.isPending}
            onChange={(next) => toggle.mutate({ itemId: item.id, outcome: next ? 'feito' : null, adaptation })}
          />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={`font-semibold ${done ? 'text-muted line-through' : ''}`}>{title}</p>
        {view?.replaces && <p className="text-xs text-muted">No lugar de {view.replaces}</p>}
        {detail && <p className="text-sm text-muted">{detail}</p>}
        {item.notes && <p className="text-xs text-muted">{item.notes}</p>}
        {doneLabel && <p className="text-xs font-semibold text-primary">Feito na versão: {doneLabel}</p>}
      </div>
      {view?.replaces ? (
        <Link
          to={exercisePath(view.name)}
          state={{ back: { to: '/plano', label: 'Meu plano' } }}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-chip px-3 text-xs font-semibold text-ink"
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" /> Como fazer
          <span className="sr-only"> {view.name}</span>
        </Link>
      ) : item.video_url && (
        <a
          href={item.video_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-full bg-chip px-3 text-xs font-semibold text-ink"
        >
          <PlayCircle className="h-4 w-4" aria-hidden="true" /> Vídeo
          <span className="sr-only"> de {item.title} (abre em nova aba)</span>
        </a>
      )}
    </li>
  )
}

function PainCard({ value }: { value: number | null }) {
  const setPain = useSetPain()
  const shown = setPain.isPending ? setPain.variables : value
  const labelId = useId()
  return (
    <div className="card space-y-3">
      <p id={labelId} className="text-sm font-semibold">
        Dor hoje (0 a 10)
      </p>
      <div role="group" aria-labelledby={labelId} className="grid grid-cols-6 gap-2">
        {PAIN_LEVELS.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={shown === n}
            onClick={() => setPain.mutate(n)}
            className={`min-h-11 rounded-xl border text-sm font-semibold transition ${
              shown === n ? 'border-primary bg-primary text-white' : 'border-line bg-card text-ink hover:border-lavender'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {setPain.isError && <p className="text-sm text-attention">Não deu para salvar: {setPain.error.message}</p>}
      <p className="text-xs text-muted">0 é sem dor. Seu fisio acompanha como a dor muda na semana.</p>
    </div>
  )
}

function WeekList({ items }: { items: PersonPlanItem[] }) {
  return (
    <details className="card group">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-primary">
        <CalendarDays className="h-4 w-4" aria-hidden="true" /> Ver o plano da semana
      </summary>
      <ul className="mt-2 divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="py-2.5 text-sm">
            <p className="font-semibold">{i.title}</p>
            <p className="text-muted">
              {[weekdaysLabel(i.weekdays), itemDetail(i)].filter(Boolean).join(' · ')}
            </p>
          </li>
        ))}
      </ul>
    </details>
  )
}
