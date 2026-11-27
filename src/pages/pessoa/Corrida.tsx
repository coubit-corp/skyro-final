import { Check, FileUp, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ImportRuns } from '../../components/RunImport'
import { ErrorState, Modal, PageHeader, Skeleton } from '../../components/ui'
import { useDeleteRunPlan, useRunPlan, useRuns, useSaveRunPlan, useSaveRuns } from '../../hooks/useRunning'
import { addDays, todayBRT } from '../../lib/dates'
import { evolutionDate } from '../../lib/evolution'
import { isoWeekday } from '../../lib/plan'
import {
  buildRunPlan,
  EFFORT,
  GOALS,
  LEVELS,
  manualRun,
  planProgress,
  runSummary,
  SPORT_LABEL,
  type RunGoal,
  type RunLevel,
  type RunPlan,
  type RunSession,
  type Sport,
} from '../../lib/running'

/** Corrida: plano progressivo, corridas importadas de GPX/TCX e registradas à mão. */
export function Corrida() {
  const todayIso = todayBRT()
  const plan = useRunPlan()
  const runs = useRuns()
  const [editing, setEditing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [manual, setManual] = useState(false)

  const runDates = useMemo(() => new Set((runs.data ?? []).filter((r) => r.details.sport !== 'pedal').map((r) => r.occurred_on)), [runs.data])

  if (plan.isLoading) return <Skeleton className="h-64" />
  if (plan.error) return <ErrorState message={plan.error.message} onRetry={() => plan.refetch()} />
  const current = plan.data?.plan ?? null

  return (
    <section className="space-y-4">
      <PageHeader
        title="Corrida"
        subtitle="Um plano que cresce aos poucos e as corridas que você faz, num lugar só."
        back={{ to: '/plano', label: 'Meu plano' }}
      />

      {!plan.data?.available ? (
        <p className="card text-sm text-muted">
          A corrida ainda não foi ativada no banco de dados (falta rodar a migration 20261128000004_corrida.sql).
        </p>
      ) : (
        <>
          {current && !editing ? (
            <PlanView plan={current} runDates={runDates} todayIso={todayIso} onEdit={() => setEditing(true)} onLog={() => setManual(true)} />
          ) : (
            <PlanForm initial={current} todayIso={todayIso} onDone={() => setEditing(false)} />
          )}

          <div className="card space-y-3">
            <div>
              <h2 className="font-semibold">Registrar corrida</h2>
              <p className="text-sm text-muted">Traga o arquivo do Strava, Garmin ou outro app, ou registre à mão.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-outline flex-1 gap-2" onClick={() => setImporting(true)}>
                <FileUp className="h-4 w-4" aria-hidden="true" /> Importar arquivo
              </button>
              <button type="button" className="btn-outline flex-1 gap-2" onClick={() => setManual(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Registrar à mão
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold">Suas corridas</h2>
            {runs.isLoading ? (
              <Skeleton className="h-24" />
            ) : runs.error ? (
              <ErrorState message={runs.error.message} onRetry={() => runs.refetch()} />
            ) : (runs.data ?? []).length === 0 ? (
              <p className="card text-sm text-muted">Nenhuma corrida ainda. Elas aparecem aqui e na sua Evolução.</p>
            ) : (
              <ul className="card divide-y divide-line py-1">
                {runs.data!.slice(0, 15).map((r) => (
                  <li key={r.id} className="py-2.5 text-sm">
                    <p className="font-semibold break-words">{r.title}</p>
                    <p className="text-muted">
                      {evolutionDate(r.occurred_on, todayIso)} · {runSummary(r.details)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <p className="text-xs text-muted">
        Plano de orientação geral. Se sentir dor ou tiver alguma limitação, pare e fale com um profissional.
      </p>

      {importing && <ImportRuns todayIso={todayIso} onClose={() => setImporting(false)} />}
      {manual && <ManualRun todayIso={todayIso} onClose={() => setManual(false)} />}
    </section>
  )
}

function PlanView({
  plan,
  runDates,
  todayIso,
  onEdit,
  onLog,
}: {
  plan: RunPlan
  runDates: Set<string>
  todayIso: string
  onEdit: () => void
  onLog: () => void
}) {
  const sessions = useMemo(() => buildRunPlan(plan), [plan])
  const p = planProgress(sessions, runDates, todayIso)
  const remove = useDeleteRunPlan()
  const [confirming, setConfirming] = useState(false)
  const [all, setAll] = useState(false)
  const goal = GOALS.find((g) => g.value === plan.goal)!
  const weeks = sessions.at(-1)?.week ?? 1
  const thisWeek = sessions.filter((s) => s.week === p.week)
  const pct = p.due ? Math.round((p.done / p.due) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="rounded-card bg-navy p-5 text-white">
        <p className="eyebrow text-lavender">
          Plano de {goal.label} · semana {Math.min(p.week, weeks)} de {weeks}
        </p>
        {p.next ? (
          <>
            <h2 className="mt-2 text-2xl font-bold">{p.next.title}</h2>
            <p className="mt-1 text-sm text-white/80">
              {p.next.date === todayIso ? 'Hoje' : evolutionDate(p.next.date, todayIso)} · {p.next.description}
            </p>
            <p className="mt-2 text-xs text-white/70">{EFFORT[p.next.kind]}</p>
            {p.today && !p.doneDates.has(todayIso) && (
              <button type="button" className="mt-3 min-h-11 rounded-full bg-lavender px-4 text-sm font-semibold text-black" onClick={onLog}>
                Registrar a corrida de hoje
              </button>
            )}
          </>
        ) : (
          <h2 className="mt-2 text-2xl font-bold">Plano concluído. Parabéns!</h2>
        )}
      </div>

      {p.due > 0 && (
        <div className="card space-y-2">
          <p className="text-sm">
            <span className="font-semibold">
              {p.done} de {p.due}
            </span>{' '}
            sessões até hoje feitas (vale corrida em outro dia da mesma semana)
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-chip" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Sessões feitas">
            <div className="h-full rounded-full bg-lavender" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="card space-y-2">
        <h3 className="font-semibold">{all ? 'Plano completo' : 'Esta semana'}</h3>
        <SessionList sessions={all ? sessions : thisWeek} doneDates={p.doneDates} todayIso={todayIso} showWeek={all} />
        <button type="button" className="min-h-11 text-sm font-semibold text-primary" onClick={() => setAll((x) => !x)}>
          {all ? 'Ver só esta semana' : `Ver as ${weeks} semanas`}
        </button>
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn-outline flex-1 gap-2" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden="true" /> Mudar plano
        </button>
        {confirming ? (
          <button type="button" className="btn-outline flex-1 text-attention" disabled={remove.isPending} onClick={() => remove.mutate()}>
            Confirmar: encerrar
          </button>
        ) : (
          <button type="button" className="btn-outline flex-1" onClick={() => setConfirming(true)}>
            Encerrar plano
          </button>
        )}
      </div>
    </div>
  )
}

function SessionList({
  sessions,
  doneDates,
  todayIso,
  showWeek,
}: {
  sessions: RunSession[]
  doneDates: Set<string>
  todayIso: string
  showWeek: boolean
}) {
  return (
    <ul className="divide-y divide-line">
      {sessions.map((s, i) => {
        const done = doneDates.has(s.date)
        const past = s.date < todayIso
        return (
          <li key={s.date} className="flex items-start gap-3 py-2 text-sm">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? 'bg-lavender text-black' : 'bg-chip'}`}
              aria-label={done ? 'Feita' : past ? 'Sem corrida registrada' : 'A fazer'}
            >
              {done && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              {showWeek && (i === 0 || sessions[i - 1].week !== s.week) && <p className="eyebrow">Semana {s.week}</p>}
              <p className={`font-semibold ${past && !done ? 'text-muted' : ''}`}>
                {s.date === todayIso ? 'Hoje' : evolutionDate(s.date, todayIso)} · {s.title}
              </p>
              <p className="text-muted">{s.description}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Próxima segunda-feira (ou hoje, se já for segunda). */
function nextMonday(todayIso: string): string {
  const wd = isoWeekday(todayIso)
  return wd === 1 ? todayIso : addDays(todayIso, 8 - wd)
}

function PlanForm({ initial, todayIso, onDone }: { initial: RunPlan | null; todayIso: string; onDone: () => void }) {
  const save = useSaveRunPlan()
  const [goal, setGoal] = useState<RunGoal>(initial?.goal ?? '5k')
  const [days, setDays] = useState(initial?.days_per_week ?? 3)
  const [level, setLevel] = useState<RunLevel>(initial?.level ?? 'iniciante')
  const [start, setStart] = useState(initial?.starts_on ?? nextMonday(todayIso))
  const preview = buildRunPlan({ goal, days_per_week: days, level, starts_on: start })

  return (
    <form
      className="card space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate({ plan: { goal, days_per_week: days, level, starts_on: start }, exists: Boolean(initial) }, { onSuccess: onDone })
      }}
    >
      <div>
        <h2 className="font-semibold">{initial ? 'Mudar plano de corrida' : 'Montar plano de corrida'}</h2>
        <p className="text-sm text-muted">O treino cresce aos poucos, com semanas mais leves para recuperar.</p>
      </div>
      <fieldset className="space-y-1">
        <legend className="eyebrow mb-1">Objetivo</legend>
        {GOALS.map((g) => (
          <label key={g.value} className="flex min-h-11 items-center gap-3 text-sm">
            <input type="radio" name="objetivo" checked={goal === g.value} onChange={() => setGoal(g.value)} /> {g.label}
          </label>
        ))}
      </fieldset>
      <fieldset className="space-y-1">
        <legend className="eyebrow mb-1">Onde você está hoje</legend>
        {LEVELS.map((l) => (
          <label key={l.value} className="flex min-h-11 items-start gap-3 text-sm">
            <input type="radio" name="nivel" className="mt-1" checked={level === l.value} onChange={() => setLevel(l.value)} />
            <span>
              {l.label}
              <span className="block text-xs text-muted">{l.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs font-semibold text-muted">
          Dias por semana
          <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} dias
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted">
          Começa em
          <input type="date" className="input" value={start} min={addDays(todayIso, -28)} onChange={(e) => setStart(e.target.value)} />
        </label>
      </div>
      <p className="text-sm text-muted">
        {preview.at(-1)?.week ?? 0} semanas, {preview.length} sessões. A primeira: {preview[0]?.title.toLowerCase()} em{' '}
        {preview[0] ? evolutionDate(preview[0].date, todayIso) : '—'}.
      </p>
      {save.error && (
        <p className="text-sm text-attention" role="alert">
          {save.error.message}
        </p>
      )}
      <div className="flex gap-2">
        {initial && (
          <button type="button" className="btn-outline flex-1" onClick={onDone}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary flex-1" disabled={save.isPending || !start}>
          {save.isPending ? 'Salvando…' : initial ? 'Salvar plano' : 'Criar plano'}
        </button>
      </div>
    </form>
  )
}

function ManualRun({ todayIso, onClose }: { todayIso: string; onClose: () => void }) {
  const save = useSaveRuns()
  const [sport, setSport] = useState<Sport>('corrida')
  const [date, setDate] = useState(todayIso)
  const [distance, setDistance] = useState('')
  const [duration, setDuration] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal open onClose={onClose} title="Registrar corrida">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          const run = manualRun({ date, distance, duration, sport }, todayIso)
          if (typeof run === 'string') return setError(run)
          setError(null)
          save.mutate([run], { onSuccess: onClose })
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1 text-xs font-semibold text-muted">
            Atividade
            <select className="input" value={sport} onChange={(e) => setSport(e.target.value as Sport)}>
              {(Object.keys(SPORT_LABEL) as Sport[]).map((s) => (
                <option key={s} value={s}>
                  {SPORT_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-semibold text-muted">
            Data
            <input type="date" className="input" value={date} max={todayIso} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="space-y-1 text-xs font-semibold text-muted">
            Distância (km)
            <input className="input" inputMode="decimal" placeholder="5,2" value={distance} onChange={(e) => setDistance(e.target.value)} />
          </label>
          <label className="space-y-1 text-xs font-semibold text-muted">
            Duração (min)
            <input className="input" inputMode="numeric" placeholder="32 ou 31:30" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </label>
        </div>
        {(error || save.error) && (
          <p className="text-sm text-attention" role="alert">
            {error ?? save.error?.message}
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-outline flex-1" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
