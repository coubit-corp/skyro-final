import { Dumbbell, Flag, Salad, Target, Trash2, Trophy, Upload, type LucideIcon } from 'lucide-react'
import { useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../auth/auth-context'
import { useAddMilestone, useDeleteHistoryEntry, useEvolution, useImportWorkouts } from '../hooks/useEvolution'
import { todayBRT } from '../lib/dates'
import {
  buildTimeline,
  EVOLUTION_FILTERS,
  EVOLUTION_PERIODS,
  evolutionDate,
  filterTimeline,
  MILESTONE_TITLE_MAX,
  validateMilestone,
  type EvolutionItem,
  type EvolutionKind,
  type EvolutionPeriod,
} from '../lib/evolution'
import { HEVY_MAX_BYTES, parseHevyCsv, type HevyPreview } from '../lib/hevy'
import { ChipTabs, ErrorState, Modal, Skeleton } from './ui'

const ICONS: Record<EvolutionKind, LucideIcon> = {
  treino: Dumbbell,
  alimentacao: Salad,
  meta: Target,
  desafio: Trophy,
  marco: Flag,
}
const PAGE = 30

/** Minha Evolução: linha do tempo com filtros, importação do Hevy e marco manual. */
export function EvolutionTimeline() {
  const todayIso = todayBRT()
  const evolution = useEvolution()
  // A conta demo é pública: nada pessoal é gravado nela (o banco também recusa).
  const demo = Boolean(useAuth().profile?.is_demo)
  const [kind, setKind] = useState<EvolutionKind | 'tudo'>('tudo')
  const [period, setPeriod] = useState<EvolutionPeriod>('30')
  const [shown, setShown] = useState(PAGE)
  const [importOpen, setImportOpen] = useState(false)
  const [milestoneOpen, setMilestoneOpen] = useState(false)

  const all = useMemo(() => (evolution.data ? buildTimeline(evolution.data, todayIso) : []), [evolution.data, todayIso])
  const items = useMemo(() => filterTimeline(all, kind, period, todayIso), [all, kind, period, todayIso])

  return (
    <section aria-label="Minha evolução" className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">Minha história</h2>
        <p className="text-sm text-muted">Treinos, refeições, ajustes e desafios, pela data em que aconteceram.</p>
      </div>

      {evolution.data?.historyAvailable && demo && (
        <p className="text-sm text-muted">
          Na conta de demonstração a história é só um exemplo. Crie sua conta para trazer seus treinos e marcos.
        </p>
      )}
      {evolution.data?.historyAvailable && !demo && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-outline gap-2 px-4 py-2.5" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" aria-hidden="true" /> Trazer meu histórico
          </button>
          <button type="button" className="btn-outline gap-2 px-4 py-2.5" onClick={() => setMilestoneOpen(true)}>
            <Flag className="h-4 w-4" aria-hidden="true" /> Adicionar marco
          </button>
        </div>
      )}

      <ChipTabs
        label="Período"
        options={EVOLUTION_PERIODS}
        value={period}
        onChange={(v) => {
          setPeriod(v)
          setShown(PAGE)
        }}
      />
      <ChipTabs
        label="Tipo de registro"
        options={EVOLUTION_FILTERS}
        value={kind}
        onChange={(v) => {
          setKind(v)
          setShown(PAGE)
        }}
      />

      {evolution.error ? (
        <ErrorState message={evolution.error.message} onRetry={() => evolution.refetch()} />
      ) : !evolution.data ? (
        <Skeleton className="h-40" />
      ) : items.length === 0 ? (
        <p className="card text-sm text-muted">
          {all.length === 0
            ? 'Sua história começa no primeiro registro. Você também pode trazer treinos antigos ou adicionar um marco.'
            : 'Nada nesse período com esse filtro.'}
        </p>
      ) : (
        <>
          <ul className="card divide-y divide-line py-1">
            {items.slice(0, shown).map((i) => (
              <TimelineRow key={i.key} item={i} todayIso={todayIso} canDelete={!demo || Boolean(i.logged)} />
            ))}
          </ul>
          {items.length > shown && (
            <button type="button" className="btn-outline w-full" onClick={() => setShown((n) => n + PAGE)}>
              Ver mais antigos
            </button>
          )}
        </>
      )}

      {importOpen && <ImportModal todayIso={todayIso} onClose={() => setImportOpen(false)} />}
      {milestoneOpen && <MilestoneModal todayIso={todayIso} onClose={() => setMilestoneOpen(false)} />}
    </section>
  )
}

function TimelineRow({ item: i, todayIso, canDelete }: { item: EvolutionItem; todayIso: string; canDelete: boolean }) {
  const remove = useDeleteHistoryEntry()
  const [confirming, setConfirming] = useState(false)
  const Icon = ICONS[i.kind]
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-chip text-muted">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold break-words">{i.title}</p>
        {i.subtitle && <p className="text-sm text-muted break-words">{i.subtitle}</p>}
        <p className="text-xs text-muted">
          {evolutionDate(i.date, todayIso)}
          {i.origin && ` · ${i.origin}`}
        </p>
        {confirming && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span>Apagar este registro?</span>
            <button
              type="button"
              className="min-h-11 font-semibold text-attention"
              disabled={remove.isPending}
              onClick={() => remove.mutate(i.entryId!)}
            >
              Apagar
            </button>
            <button type="button" className="min-h-11 font-semibold text-muted" onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </div>
        )}
        {remove.isError && <p className="text-xs text-attention">Não deu para apagar. Tente de novo.</p>}
      </div>
      {i.entryId && canDelete && !confirming && (
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-chip hover:text-ink"
          aria-label={`Apagar: ${i.title}`}
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </li>
  )
}

function ImportModal({ todayIso, onClose }: { todayIso: string; onClose: () => void }) {
  const save = useImportWorkouts()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<HevyPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPreview(null)
    save.reset()
    if (file.size > HEVY_MAX_BYTES) return setError('O arquivo passa de 5 MB.')
    const parsed = parseHevyCsv(await file.text(), todayIso)
    if (!parsed) return setError('Não reconhecemos esse arquivo. Use o CSV de treinos exportado pelo Hevy.')
    if (parsed.workouts.length === 0) return setError('Não encontramos nenhum treino com data nesse arquivo.')
    setError(null)
    setPreview(parsed)
  }

  const result = save.data
  return (
    <Modal open onClose={onClose} title="Trazer meu histórico">
      {result ? (
        <>
          <p className="text-sm">
            {result.added === 0
              ? 'Esses treinos já estavam na sua história. Nada foi duplicado.'
              : `${result.added} ${result.added === 1 ? 'treino entrou' : 'treinos entraram'} na sua história.`}
            {result.added > 0 && result.repeated > 0 && ` ${result.repeated} já estavam e não foram repetidos.`}
          </p>
          <button type="button" className="btn-primary w-full" onClick={onClose}>
            Fechar
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            No Hevy, abra Perfil → Configurações → Exportar e importar dados → Exportar dados. Depois escolha aqui o
            arquivo de treinos (CSV). Você confere tudo antes de salvar.
          </p>
          <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={onFile} aria-label="Arquivo de treinos do Hevy" />
          <button type="button" className="btn-outline w-full" onClick={() => input.current?.click()}>
            {preview ? 'Escolher outro arquivo' : 'Escolher arquivo'}
          </button>
          {error && <p className="text-sm text-attention" role="alert">{error}</p>}

          {preview && (
            <div className="space-y-2 rounded-xl border border-line p-3 text-sm">
              <p className="font-semibold">
                {preview.workouts.length} {preview.workouts.length === 1 ? 'treino' : 'treinos'}, de{' '}
                {evolutionDate(preview.from!, todayIso)} a {evolutionDate(preview.to!, todayIso)}
              </p>
              <p className="text-muted">
                {preview.exercises.length} {preview.exercises.length === 1 ? 'exercício reconhecido' : 'exercícios reconhecidos'}:{' '}
                {preview.exercises.slice(0, 8).map((e) => e.name).join(', ')}
                {preview.exercises.length > 8 && ` e mais ${preview.exercises.length - 8}`}
              </p>
              {preview.skippedRows > 0 && (
                <p className="text-muted">
                  {preview.skippedRows} {preview.skippedRows === 1 ? 'linha ficou' : 'linhas ficaram'} de fora (sem data,
                  sem exercício ou com data no futuro).
                </p>
              )}
              <p className="text-xs text-muted">
                Treinos que já estão na sua história não são repetidos. Treinos importados não contam pontos em
                desafios.
              </p>
            </div>
          )}
          {save.isError && <p className="text-sm text-attention" role="alert">Não deu para salvar. Tente de novo.</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={!preview || save.isPending}
              onClick={() => preview && save.mutate(preview.workouts)}
            >
              {save.isPending ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}

function MilestoneModal({ todayIso, onClose }: { todayIso: string; onClose: () => void }) {
  const add = useAddMilestone()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayIso)
  const [error, setError] = useState<string | null>(null)
  const titleId = useId()
  const dateId = useId()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const problem = validateMilestone(title, date, todayIso)
    setError(problem)
    if (!problem) add.mutate({ title, date }, { onSuccess: onClose })
  }

  return (
    <Modal open onClose={onClose} title="Adicionar marco">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor={titleId} className="mb-1 block text-sm font-semibold">
            O que você conquistou?
          </label>
          <input
            id={titleId}
            className="input"
            value={title}
            maxLength={MILESTONE_TITLE_MAX}
            placeholder="Concluí meu primeiro desafio de 12 treinos"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={dateId} className="mb-1 block text-sm font-semibold">
            Quando foi?
          </label>
          <input id={dateId} type="date" className="input" value={date} max={todayIso} onChange={(e) => setDate(e.target.value)} />
        </div>
        <p className="text-xs text-muted">O marco aparece na sua história como "Adicionado por você".</p>
        {(error || add.isError) && (
          <p className="text-sm text-attention" role="alert">{error ?? 'Não deu para salvar. Tente de novo.'}</p>
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-outline flex-1" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={add.isPending}>
            {add.isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
