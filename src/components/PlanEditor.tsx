import { ClipboardList, Pencil, PlayCircle, Plus, Trash2 } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  useDeletePlanItem,
  usePatientPlan,
  useSavePlanItem,
  useMealPhotoUrls,
  useSavePlanNote,
  type PatientPlan,
} from '../hooks/usePlanData'
import type { DailyLog, PlanItem, PlanKind, Specialty } from '../lib/database.types'
import { dayOfMonth, today, weekdayShort } from '../lib/dates'
import {
  adherence,
  FOODS_MAX,
  initialPlanValues,
  itemDetail,
  KIND_NOUN,
  kindForSpecialty,
  lastWeekDays,
  NOTES_MAX,
  OUTCOME_LABEL,
  PLAN_NOTE_MAX,
  tabForKind,
  TITLE_MAX,
  hasNutrition,
  macrosLabel,
  mealDays,
  sumMacros,
  itemsForDay,
  toPlanItemRow,
  validatePlanItem,
  WEEKDAYS,
  weekdaysLabel,
  type PlanItemErrors,
  type PlanItemValues,
} from '../lib/plan'
import { ErrorState, Modal, Skeleton } from './ui'

/** Plano que o profissional monta para o paciente, na ficha do paciente. */
export function PlanEditor({
  personId,
  firstName,
  specialty,
  logs,
}: {
  personId: string
  firstName: string
  specialty: Specialty
  logs: DailyLog[]
}) {
  const kind = kindForSpecialty(specialty)
  const plan = usePatientPlan(personId)
  const remove = useDeletePlanItem(personId)
  const [editing, setEditing] = useState<PlanItem | 'novo' | null>(null)
  const [deleting, setDeleting] = useState<PlanItem | null>(null)
  const todayIso = today()

  const week = useMemo(() => lastWeekDays(todayIso), [todayIso])
  const stats = plan.data ? adherence(plan.data.items, plan.data.checks, week) : null
  const items = useMemo(
    () =>
      [...(plan.data?.items ?? [])].sort((a, b) =>
        kind === 'refeicao' ? (a.meal_time ?? '').localeCompare(b.meal_time ?? '') : a.position - b.position,
      ),
    [plan.data, kind],
  )

  return (
    <section className="card space-y-4" aria-labelledby="plano-titulo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="plano-titulo" className="flex items-center gap-2 text-lg font-bold">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" /> Plano de {firstName}
          </h2>
          <p className="text-sm text-muted">
            Aparece na aba {tabForKind(kind).label} do “Meu plano” de {firstName}.
          </p>
        </div>
        {stats && stats.planned > 0 && (
          <p className="rounded-full bg-lavender-soft px-3 py-1 text-sm font-semibold text-primary">
            Últimos 7 dias: {stats.done} de {stats.planned} feitos ({Math.round((stats.done / stats.planned) * 100)}%)
          </p>
        )}
      </div>

      {plan.isLoading ? (
        <Skeleton className="h-40" />
      ) : plan.error ? (
        <ErrorState message={plan.error.message} onRetry={() => plan.refetch()} />
      ) : (
        <>
          {kind === 'fisio' && <PainWeek logs={logs} days={[...week.slice(1), todayIso]} />}

          {kind === 'refeicao' && <NutritionView items={plan.data!.items} checks={plan.data!.checks} days={[...week.slice(1), todayIso]} />}

          <NoteForm personId={personId} initial={plan.data!.note?.note ?? ''} exists={Boolean(plan.data!.note)} />

          {items.length === 0 ? (
            <p className="rounded-xl bg-surface px-3 py-3 text-sm text-muted">
              Nenhum item ainda. Adicione o primeiro: {firstName} vê na hora e marca o que fez em cada dia.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((i) => {
                const detail = itemDetail(i)
                return (
                  <li key={i.id} className="flex items-center gap-2 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{i.title}</p>
                      <p className="text-sm text-muted">{[weekdaysLabel(i.weekdays), detail].filter(Boolean).join(' · ')}</p>
                      {macrosLabel(i) && (
                        <p className="text-xs text-muted">
                          {macrosLabel(i)}
                          {i.show_macros ? ' · a pessoa vê' : ' · só você vê'}
                        </p>
                      )}
                      {(i.alternatives?.length ?? 0) > 0 && (
                        <p className="text-xs text-muted">Substituições: {i.alternatives!.join(', ')}</p>
                      )}
                      {i.notes && <p className="text-xs text-muted">{i.notes}</p>}
                      {i.video_url && (
                        <p className="inline-flex items-center gap-1 text-xs text-muted">
                          <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" /> com vídeo
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-primary hover:bg-lavender-soft"
                      onClick={() => setEditing(i)}
                      aria-label={`Editar ${i.title}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-attention hover:bg-attention-soft"
                      onClick={() => setDeleting(i)}
                      aria-label={`Remover ${i.title}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <button type="button" className="btn-primary w-full" onClick={() => setEditing('novo')}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar {KIND_NOUN[kind]}
          </button>
        </>
      )}

      {editing && (
        <ItemModal
          key={editing === 'novo' ? 'novo' : editing.id}
          personId={personId}
          kind={kind}
          item={editing === 'novo' ? null : editing}
          nextPosition={Math.max(0, ...(plan.data?.items ?? []).map((i) => i.position)) + 1}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <Modal open onClose={() => setDeleting(null)} title={`Remover “${deleting.title}”?`}>
          <p className="text-sm text-muted">Sai do plano de {firstName} na hora. As marcações antigas deste item também somem.</p>
          {remove.isError && <p role="alert" className="text-sm text-attention">Não deu para remover: {remove.error.message}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={() => setDeleting(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary flex-1"
              disabled={remove.isPending}
              onClick={async () => {
                try {
                  await remove.mutateAsync(deleting.id)
                  setDeleting(null)
                } catch {
                  /* a mensagem aparece acima */
                }
              }}
            >
              {remove.isPending ? 'Removendo…' : 'Remover'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}

function PainWeek({ logs, days }: { logs: DailyLog[]; days: string[] }) {
  const byDate = new Map(logs.map((l) => [l.log_date, l.pain_level]))
  const todayIso = days[days.length - 1]
  return (
    <div>
      <h3 className="eyebrow mb-2">Dor nos últimos 7 dias (0 a 10)</h3>
      <ul className="grid grid-cols-7 gap-1 text-center">
        {days.map((d) => {
          const v = byDate.get(d)
          return (
            <li key={d} className="rounded-xl bg-surface py-2">
              <span className="block text-[11px] text-muted">{d === todayIso ? 'Hoje' : weekdayShort(d)}</span>
              <span className={`font-display text-lg font-bold ${v != null && v >= 7 ? 'text-attention' : ''}`}>
                {v ?? '—'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NoteForm({ personId, initial, exists }: { personId: string; initial: string; exists: boolean }) {
  const save = useSavePlanNote(personId)
  const [note, setNote] = useState(initial)
  const [saved, setSaved] = useState(false)
  const id = useId()
  const dirty = note.trim() !== initial.trim()

  async function submit(e: FormEvent) {
    e.preventDefault()
    await save.mutateAsync({ note, exists })
    setSaved(true)
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={id} className="eyebrow block">
        Recado geral
      </label>
      <textarea
        id={id}
        className="input min-h-20 resize-y"
        maxLength={PLAN_NOTE_MAX}
        placeholder="Ex.: Faça antes do treino. Se sentir dor acima de 6, pare e me avise."
        value={note}
        onChange={(e) => {
          setNote(e.target.value)
          setSaved(false)
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted" role="status">
          {save.isError ? `Não deu para salvar: ${save.error.message}` : saved && !dirty ? 'Recado salvo ✓' : `${note.length} / ${PLAN_NOTE_MAX}`}
        </span>
        <button type="submit" className="btn-outline px-4" disabled={!dirty || save.isPending}>
          {save.isPending ? 'Salvando…' : 'Salvar recado'}
        </button>
      </div>
    </form>
  )
}

function ItemModal({
  personId,
  kind,
  item,
  nextPosition,
  onClose,
}: {
  personId: string
  kind: PlanKind
  item: PlanItem | null
  nextPosition: number
  onClose: () => void
}) {
  const save = useSavePlanItem(personId)
  const [v, setV] = useState<PlanItemValues>(() => initialPlanValues(item))
  const [errors, setErrors] = useState<PlanItemErrors>({})
  const set = (patch: Partial<PlanItemValues>) => setV((cur) => ({ ...cur, ...patch }))
  const exercise = kind === 'treino' || kind === 'fisio'

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errs = validatePlanItem(kind, v)
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      // Calorias, macros e substituições só vão quando usadas (agora ou antes): sem a migration
      // de nutrição no banco, salvar uma refeição comum continua funcionando.
      const withNutrition = hasNutrition(v) || hasNutrition(initialPlanValues(item))
      await save.mutateAsync({ id: item?.id, row: toPlanItemRow(kind, v, withNutrition), position: item?.position ?? nextPosition })
      onClose()
    } catch {
      /* a mensagem aparece no formulário */
    }
  }

  const titleHint: Record<PlanKind, string> = {
    treino: 'Ex.: Agachamento livre',
    fisio: 'Ex.: Rotação externa com elástico',
    refeicao: 'Ex.: Café da manhã',
    respiracao: 'Ex.: Respiração 4-7-8 antes de dormir',
  }

  return (
    <Modal open onClose={onClose} title={item ? `Editar ${KIND_NOUN[kind]}` : `Adicionar ${KIND_NOUN[kind]}`}>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <Field label="Nome" error={errors.title}>
          {(p) => (
            <input {...p} className="input" maxLength={TITLE_MAX} placeholder={titleHint[kind]} value={v.title} onChange={(e) => set({ title: e.target.value })} />
          )}
        </Field>

        <fieldset>
          <legend className="eyebrow mb-1.5">Dias</legend>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((d) => {
              const on = v.weekdays.includes(d.n)
              return (
                <button
                  key={d.n}
                  type="button"
                  aria-pressed={on}
                  aria-label={d.short}
                  onClick={() => set({ weekdays: on ? v.weekdays.filter((x) => x !== d.n) : [...v.weekdays, d.n] })}
                  className={`min-h-11 rounded-xl border text-xs font-semibold transition ${
                    on ? 'border-primary bg-primary text-white' : 'border-line bg-card text-ink'
                  }`}
                >
                  {d.short}
                </button>
              )
            })}
          </div>
          {errors.weekdays && <p className="mt-1 text-xs text-attention">{errors.weekdays}</p>}
        </fieldset>

        {exercise && (
          <div className={`grid gap-2 ${kind === 'treino' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <Field label="Séries" error={errors.sets}>
              {(p) => <input {...p} className="input" inputMode="numeric" placeholder="3" value={v.sets} onChange={(e) => set({ sets: e.target.value })} />}
            </Field>
            <Field label="Repetições" error={errors.reps}>
              {(p) => <input {...p} className="input" maxLength={20} placeholder="12 ou 30 s" value={v.reps} onChange={(e) => set({ reps: e.target.value })} />}
            </Field>
            {kind === 'treino' && (
              <Field label="Carga" error={errors.load}>
                {(p) => <input {...p} className="input" maxLength={20} placeholder="20 kg" value={v.load} onChange={(e) => set({ load: e.target.value })} />}
              </Field>
            )}
          </div>
        )}

        {kind === 'refeicao' && (
          <>
            <Field label="Horário" error={errors.mealTime}>
              {(p) => <input {...p} type="time" className="input" value={v.mealTime} onChange={(e) => set({ mealTime: e.target.value })} />}
            </Field>
            <Field label="O que comer" error={errors.foods}>
              {(p) => (
                <textarea {...p} className="input min-h-20 resize-y" maxLength={FOODS_MAX} placeholder="Ex.: Arroz, feijão, frango grelhado e salada" value={v.foods} onChange={(e) => set({ foods: e.target.value })} />
              )}
            </Field>
            <Field label="Substituições sugeridas (opcional, uma por linha)" error={errors.alternatives}>
              {(p) => (
                <textarea
                  {...p}
                  className="input min-h-16 resize-y"
                  placeholder={'Ex.: Macarrão com carne moída\nOmelete com salada'}
                  value={v.alternatives}
                  onChange={(e) => set({ alternatives: e.target.value })}
                />
              )}
            </Field>
            <fieldset className="space-y-2">
              <legend className="eyebrow mb-1">Calorias e macros (opcional)</legend>
              <div className="grid grid-cols-4 gap-2">
                <Field label="kcal" error={errors.kcal}>
                  {(p) => <input {...p} className="input px-2" inputMode="numeric" placeholder="600" value={v.kcal} onChange={(e) => set({ kcal: e.target.value })} />}
                </Field>
                <Field label="Proteína (g)" error={errors.protein}>
                  {(p) => <input {...p} className="input px-2" inputMode="decimal" placeholder="40" value={v.protein} onChange={(e) => set({ protein: e.target.value })} />}
                </Field>
                <Field label="Carbo (g)" error={errors.carbs}>
                  {(p) => <input {...p} className="input px-2" inputMode="decimal" placeholder="70" value={v.carbs} onChange={(e) => set({ carbs: e.target.value })} />}
                </Field>
                <Field label="Gordura (g)" error={errors.fat}>
                  {(p) => <input {...p} className="input px-2" inputMode="decimal" placeholder="15" value={v.fat} onChange={(e) => set({ fat: e.target.value })} />}
                </Field>
              </div>
              <label className="flex min-h-11 items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={v.showMacros} onChange={(e) => set({ showMacros: e.target.checked })} />
                <span>
                  Mostrar esses números para a pessoa
                  <span className="block text-xs text-muted">Desmarcado, só você vê. Use se fizer sentido para o objetivo dela.</span>
                </span>
              </label>
            </fieldset>
          </>
        )}

        {kind === 'respiracao' && (
          <Field label="Duração (minutos)" error={errors.durationMin}>
            {(p) => <input {...p} className="input" inputMode="numeric" placeholder="5" value={v.durationMin} onChange={(e) => set({ durationMin: e.target.value })} />}
          </Field>
        )}

        <Field label={kind === 'respiracao' ? 'Como fazer (opcional)' : 'Observação (opcional)'} error={errors.notes}>
          {(p) => (
            <input
              {...p}
              className="input"
              maxLength={NOTES_MAX}
              placeholder={kind === 'respiracao' ? 'Ex.: Inspire em 4 s, segure 7 s, solte em 8 s' : 'Ex.: Descanso de 60 s entre as séries'}
              value={v.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          )}
        </Field>

        <Field label="Link de vídeo (opcional)" error={errors.videoUrl}>
          {(p) => <input {...p} type="url" className="input" placeholder="https://" value={v.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} />}
        </Field>

        {save.isError && (
          <p role="alert" className="rounded-xl bg-attention-soft px-3 py-2 text-sm text-attention">
            Não deu para salvar: {save.error.message}
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-outline flex-1" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary flex-1" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : item ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/** Rótulo ligado ao campo + mensagem de erro anunciada pelo leitor de tela. */
function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: (p: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}) {
  const id = useId()
  const errId = `${id}-erro`
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? errId : undefined })}
      {error && (
        <p id={errId} className="text-xs text-attention">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Visão da nutricionista: calorias e macros planejados para hoje, como cada dia da
 * semana foi registrado e as substituições, dificuldades e fotos recentes.
 */
function NutritionView({ items, checks, days }: { items: PlanItem[]; checks: PatientPlan['checks']; days: string[] }) {
  const titles = new Map(items.map((i) => [i.id, i.title]))
  const todayIso = days[days.length - 1]
  const todayTotals = sumMacros(itemsForDay(items, todayIso))
  const hasMacros = items.some((i) => macrosLabel(i))
  const week = mealDays(items, checks, days)
  const rows = checks
    .filter((c) => titles.has(c.item_id) && (c.outcome !== 'feito' || c.photo_path))
    .sort((a, b) => b.check_date.localeCompare(a.check_date))
  const photos = useMealPhotoUrls(rows.map((c) => c.photo_path).filter((p): p is string => Boolean(p)))
  const [open, setOpen] = useState<string | null>(null)
  const g = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

  return (
    <div className="space-y-3">
      {hasMacros && (
        <div className="rounded-xl bg-surface px-3 py-3 text-sm">
          <p className="font-semibold">Planejado para hoje</p>
          <p className="text-muted">
            {todayTotals.kcal} kcal · Proteína {g(todayTotals.protein)} g · Carboidrato {g(todayTotals.carbs)} g · Gordura{' '}
            {g(todayTotals.fat)} g
          </p>
        </div>
      )}

      {week.some((d) => d.planned > 0) && (
        <div className="rounded-xl bg-surface px-3 py-3">
          <p className="text-sm font-semibold">Últimos 7 dias</p>
          <p className="text-xs text-muted">Sem registro não quer dizer que a pessoa não comeu: vale perguntar.</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="py-1 font-semibold">Dia</th>
                  <th className="py-1 font-semibold">
                    <abbr title="Como planejado">Plan.</abbr>
                  </th>
                  <th className="py-1 font-semibold">
                    <abbr title="Substituiu">Subst.</abbr>
                  </th>
                  <th className="py-1 font-semibold">
                    <abbr title="Não conseguiu">Não</abbr>
                  </th>
                  <th className="py-1 font-semibold">
                    <abbr title="Sem registro">S/ reg.</abbr>
                  </th>
                  {hasMacros && <th className="py-1 font-semibold">kcal</th>}
                </tr>
              </thead>
              <tbody>
                {week.map((d) => (
                  <tr key={d.date} className="border-t border-line">
                    <td className="py-1.5 whitespace-nowrap">
                      {weekdayShort(d.date)} {dayOfMonth(d.date)}
                    </td>
                    <td>{d.planned ? `${d.asPlanned}/${d.planned}` : '—'}</td>
                    <td>{d.substituted || '—'}</td>
                    <td>{d.missed || '—'}</td>
                    <td>{d.unknown || '—'}</td>
                    {hasMacros && <td>{d.kcalPlanned ? `${d.kcalAsPlanned} de ${d.kcalPlanned}` : '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-xs text-muted">
            Plan.: como planejado · Subst.: substituiu · Não: não conseguiu · S/ reg.: sem registro
            {hasMacros && ' · kcal: das refeições feitas como planejado, de quanto foi planejado'}
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-xl bg-surface px-3 py-3">
          <p className="text-sm font-semibold">Substituições, dificuldades e fotos recentes</p>
          <ul className="mt-2 space-y-2 text-sm">
            {rows.map((c) => {
              const url = c.photo_path ? photos.data?.get(c.photo_path) : undefined
              return (
                <li key={`${c.item_id}|${c.check_date}`} className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-muted">
                      {weekdayShort(c.check_date)} {dayOfMonth(c.check_date)} ·{' '}
                    </span>
                    <span className="font-semibold">{titles.get(c.item_id)}</span>: {OUTCOME_LABEL[c.outcome].toLowerCase()}
                    {c.note && <span className="text-muted"> — “{c.note}”</span>}
                  </div>
                  {url && (
                    <button
                      type="button"
                      onClick={() => setOpen(url)}
                      className="h-12 w-12 shrink-0 overflow-hidden rounded-lg"
                      aria-label={`Ver foto de ${titles.get(c.item_id)}`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {open && (
        <Modal open onClose={() => setOpen(null)} title="Foto da refeição" wide>
          <img src={open} alt="Foto da refeição enviada pela pessoa" className="max-h-[70vh] w-full rounded-xl object-contain" />
          <button type="button" className="btn-outline w-full" onClick={() => setOpen(null)}>
            Fechar
          </button>
        </Modal>
      )}
    </div>
  )
}
