import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ExerciseSteps, ExerciseTags, ExerciseVideo } from '../../components/ExerciseGuide'
import { ChipTabs, ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { useKnownExercises, useWorkoutHistory } from '../../hooks/useWorkouts'
import { todayBRT } from '../../lib/dates'
import { equipmentLabel } from '../../lib/exerciseGuide'
import { evolutionDate } from '../../lib/evolution'
import { exerciseEquipment, exerciseInfo, exercisePath, exerciseStats, formatKg, muscleLabel, setLabel, similarExercises, type ExerciseBack } from '../../lib/workouts'

type Metric = 'maxKg' | 'best1rm'
const METRICS: { value: Metric; label: string }[] = [
  { value: 'maxKg', label: 'Maior peso' },
  { value: 'best1rm', label: 'Máximo para 1 repetição' },
]

type Tab = 'como' | 'resumo' | 'historico'
const TABS: { value: Tab; label: string }[] = [
  { value: 'como', label: 'Como fazer' },
  { value: 'resumo', label: 'Resumo' },
  { value: 'historico', label: 'Histórico' },
]

/** Um exercício: vídeo e passo a passo, gráfico de carga, recordes pessoais e histórico. */
export function Exercicio() {
  const name = useParams().nome ?? ''
  const back = (useLocation().state as ExerciseBack | null)?.back ?? { to: '/plano/exercicios', label: 'Exercícios' }
  const todayIso = todayBRT()
  const history = useWorkoutHistory()
  const known = useKnownExercises()
  const [tab, setTab] = useState<Tab>('como')
  const [metric, setMetric] = useState<Metric>('maxKg')
  const stats = useMemo(() => exerciseStats(history.data ?? [], name), [history.data, name])
  const info = useMemo(() => exerciseInfo(name, known), [name, known])
  const similar = info.fromCatalog ? similarExercises(info.name, info.muscle) : []

  return (
    <section className="space-y-4">
      <PageHeader title={info.name} subtitle={`Principal: ${muscleLabel(info.muscle)}`} back={back} />

      <ExerciseVideo key={info.name} name={info.name} video={info.video} />

      <ChipTabs label="Seções do exercício" options={TABS} value={tab} onChange={setTab} />

      {tab === 'como' ? (
        <>
          <div className="card space-y-4">
            <ExerciseTags info={info} />
            <ExerciseSteps info={info} />
          </div>
          {similar.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-bold">Exercícios parecidos</h2>
              <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {similar.map((e) => {
                  const eq = exerciseEquipment(e.name)
                  return (
                    <li key={e.name} className="w-40 shrink-0">
                      <Link
                        to={exercisePath(e.name)}
                        state={{ back }}
                        className="card block h-full space-y-1 p-3 text-sm transition hover:border-ink/40"
                      >
                        <span className="block font-semibold break-words">{e.name}</span>
                        {eq && <span className="block text-xs text-muted">{equipmentLabel(eq)}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      ) : history.isLoading ? (
        <Skeleton className="h-56" />
      ) : history.error ? (
        <ErrorState message={history.error.message} onRetry={() => history.refetch()} />
      ) : stats.sessions.length === 0 ? (
        <div className="card space-y-1 text-sm">
          <p className="font-semibold">Nenhuma série registrada ainda</p>
          <p className="text-muted">Complete sua primeira série para ver aqui seu melhor peso e sua evolução.</p>
        </div>
      ) : tab === 'resumo' ? (
        <>
          {stats.points.length > 0 && (
            <div className="card space-y-3">
              <ChipTabs label="Medida do gráfico" options={METRICS} value={metric} onChange={setMetric} />
              <Chart points={stats.points.map((p) => ({ date: p.date, value: p[metric] }))} todayIso={todayIso} />
            </div>
          )}

          <div className="card space-y-2">
            <h2 className="eyebrow">Recordes pessoais</h2>
            <dl className="divide-y divide-line text-sm">
              <Record label="Maior peso" value={stats.maxWeight && `${formatKg(stats.maxWeight.kg)} kg`} date={stats.maxWeight?.date} todayIso={todayIso} />
              <Record label="Melhor 1RM (estimado)" value={stats.best1rm && `${formatKg(stats.best1rm.kg)} kg`} date={stats.best1rm?.date} todayIso={todayIso} />
              <Record
                label="Melhor série"
                value={stats.bestSet && `${formatKg(stats.bestSet.kg)} kg x ${stats.bestSet.reps}`}
                date={stats.bestSet?.date}
                todayIso={todayIso}
              />
            </dl>
          </div>
        </>
      ) : (
        <ul className="space-y-3">
          {stats.sessions.slice(0, 30).map((s) => (
            <li key={s.id} className="card space-y-1 text-sm">
              <p className="font-semibold break-words">{s.title}</p>
              <p className="text-xs text-muted">{evolutionDate(s.date, todayIso)}</p>
              {s.note && <p className="pt-1 break-words">Nota: {s.note}</p>}
              <ol className="pt-1 text-muted">
                {s.sets.map((x, i) => (
                  <li key={i}>
                    <span className="inline-block w-6 font-semibold text-ink">{i + 1}</span> {setLabel(x)}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Record({
  label,
  value,
  date,
  todayIso,
}: {
  label: string
  value: string | null
  date?: string
  todayIso: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt>{label}</dt>
      <dd className="text-right font-semibold">
        {value ?? '—'}
        {value && date && <span className="block text-xs font-normal text-muted">{evolutionDate(date, todayIso)}</span>}
      </dd>
    </div>
  )
}

/** Linha simples: um ponto por treino, do mais antigo para o mais novo. */
function Chart({ points, todayIso }: { points: { date: string; value: number }[]; todayIso: string }) {
  const W = 320
  const H = 140
  const pad = { l: 8, r: 8, t: 12, b: 8 }
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i: number) => (points.length === 1 ? W / 2 : pad.l + (i * (W - pad.l - pad.r)) / (points.length - 1))
  const y = (v: number) => pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b)
  const last = points.at(-1)!
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm">
        <span className="text-lg font-bold">{formatKg(Math.round(last.value * 10) / 10)} kg</span>{' '}
        <span className="text-muted">{evolutionDate(last.date, todayIso)}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Evolução em ${points.length} treinos, de ${formatKg(Math.round(min))} a ${formatKg(Math.round(max))} kg`}>
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="stroke-line" strokeWidth="1" />
        {points.length > 1 && (
          <polyline
            fill="none"
            className="stroke-lavender"
            strokeWidth="2"
            strokeLinejoin="round"
            points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
          />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.value)} r="3" className="fill-lavender" />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted">
        <span>{evolutionDate(points[0].date, todayIso)}</span>
        {points.length > 1 && <span>{evolutionDate(last.date, todayIso)}</span>}
      </div>
    </figure>
  )
}
