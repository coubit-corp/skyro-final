// Pedido de ajuste nas duas pontas: o cartão do cliente em "Meu plano" e a fila
// "Esperando seu retorno" do profissional.

import { MessageSquare, RefreshCw } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useAdjustments,
  useCancelAdjustment,
  useDecideAdjustment,
  useRequestAdjustment,
  useRespondAdjustment,
} from '../hooks/useAdjustments'
import {
  ADJUSTMENT_KINDS,
  ADJUSTMENT_TEXT_MAX,
  kindLabel,
  statusForPerson,
  visibleForPerson,
  waitingForPro,
  waitingSince,
  type AdjustmentKind,
  type AdjustmentRequest,
} from '../lib/adjustments'
import { Avatar } from './Avatar'
import { Modal } from './ui'

// ----------------------------------------------------------------- cliente

/** Em "Meu plano", abaixo de cada profissional que acompanha a pessoa. */
export function AdjustmentCard({ proId, proName }: { proId: string; proName: string }) {
  const requests = useAdjustments('person')
  const [asking, setAsking] = useState(false)
  const first = proName.split(' ')[0]
  // null = o banco ainda não tem o recurso: não mostra nada.
  if (!requests.data) return null
  const mine = visibleForPerson(requests.data.filter((r) => r.professional_id === proId))
  const hasOpen = mine.some((r) => r.status === 'aberto')

  return (
    <section className="card space-y-3" aria-label={`Ajustes com ${first}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">A rotina mudou?</h3>
          <p className="text-sm text-muted">Peça um ajuste e {first} responde com uma proposta.</p>
        </div>
        {!hasOpen && (
          <button type="button" className="btn-outline shrink-0" onClick={() => setAsking(true)}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Pedir ajuste
          </button>
        )}
      </div>
      {mine.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {mine.map((r) => (
            <PersonRequest key={r.id} request={r} first={first} />
          ))}
        </ul>
      )}
      {asking && <RequestModal proId={proId} first={first} onClose={() => setAsking(false)} />}
    </section>
  )
}

function PersonRequest({ request: r, first }: { request: AdjustmentRequest; first: string }) {
  const decide = useDecideAdjustment()
  const cancel = useCancelAdjustment()
  const error = decide.error ?? cancel.error
  return (
    <li className="space-y-2 py-3 text-sm">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs font-semibold">{kindLabel(r.kind)}</span>
        <span className={`text-xs font-semibold ${r.status === 'aceito' ? 'text-ink' : 'text-muted'}`}>
          {statusForPerson(r, first)}
        </span>
      </p>
      <p className="text-muted">Você pediu: “{r.message}”</p>
      {r.proposal && (
        <p className="rounded-xl bg-chip px-3 py-2">
          <span className="font-semibold">Proposta de {first}:</span> {r.proposal}
        </p>
      )}
      {r.status === 'proposto' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={decide.isPending}
            onClick={() => decide.mutate({ id: r.id, accept: true })}
          >
            Aceitar
          </button>
          <button
            type="button"
            className="btn-outline"
            disabled={decide.isPending}
            onClick={() => decide.mutate({ id: r.id, accept: false })}
          >
            Recusar
          </button>
          <Link to={`/mensagens/${r.professional_id}`} className="btn-outline">
            <MessageSquare className="h-4 w-4" aria-hidden="true" /> Conversar
          </Link>
        </div>
      )}
      {r.status === 'aberto' && (
        <button
          type="button"
          className="min-h-11 text-sm font-semibold text-muted underline"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate(r.id)}
        >
          Cancelar pedido
        </button>
      )}
      {error && <p className="text-attention">{error.message}</p>}
    </li>
  )
}

function RequestModal({ proId, first, onClose }: { proId: string; first: string; onClose: () => void }) {
  const request = useRequestAdjustment()
  const [kind, setKind] = useState<AdjustmentKind>('trocar_dia')
  const [message, setMessage] = useState('')
  const textId = useId()
  const current = ADJUSTMENT_KINDS.find((k) => k.value === kind)!
  return (
    <Modal open onClose={onClose} title={`Pedir ajuste a ${first}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          request.mutate({ professionalId: proId, kind, message }, { onSuccess: onClose })
        }}
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de ajuste">
          {ADJUSTMENT_KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              aria-pressed={kind === k.value}
              onClick={() => setKind(k.value)}
              className={`min-h-11 rounded-full px-3 text-sm font-semibold ${
                kind === k.value ? 'bg-primary text-white' : 'bg-chip text-ink'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor={textId} className="text-sm font-semibold">
            O que mudou?
          </label>
          <textarea
            id={textId}
            className="input mt-1 min-h-28 w-full py-3"
            maxLength={ADJUSTMENT_TEXT_MAX}
            placeholder={current.placeholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        <p className="text-xs text-muted">
          Seu plano continua como está até você aceitar a proposta de {first}.
        </p>
        {request.error && <p className="text-sm text-attention">{request.error.message}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onClose}>
            Agora não
          </button>
          <button type="submit" className="btn-primary" disabled={request.isPending || !message.trim()}>
            Enviar pedido
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ------------------------------------------------------------ profissional

export interface AdjustmentPatient {
  id: string
  name: string
  avatarSeed?: string | null
  avatarPath?: string | null
}

/** Fila do profissional: pedidos sem resposta, o mais antigo primeiro. */
export function PendingAdjustments({ patients }: { patients: AdjustmentPatient[] }) {
  const requests = useAdjustments('professional')
  if (!requests.data) return null
  const byId = new Map(patients.map((p) => [p.id, p]))
  // Só de quem ainda acompanha: sem compartilhamento ativo o pedido nem chega aqui.
  const waiting = waitingForPro(requests.data).filter((r) => byId.has(r.person_id))
  if (waiting.length === 0) return null
  return (
    <section aria-label="Esperando seu retorno" className="space-y-2">
      <h2 className="eyebrow pt-1">Esperando seu retorno · {waiting.length}</h2>
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {waiting.map((r) => (
          <ProRequest key={r.id} request={r} patient={byId.get(r.person_id)!} />
        ))}
      </ul>
    </section>
  )
}

function ProRequest({ request: r, patient }: { request: AdjustmentRequest; patient: AdjustmentPatient }) {
  const respond = useRespondAdjustment()
  const [proposal, setProposal] = useState('')
  const textId = useId()
  const first = patient.name.split(' ')[0]
  return (
    <li className="card min-w-0 space-y-3">
      <div className="flex items-center gap-3">
        <Avatar seed={patient.avatarSeed} photo={patient.avatarPath} name={patient.name} size={40} />
        <div className="min-w-0 flex-1">
          <Link to={`/pro/pacientes/${patient.id}`} className="font-semibold hover:underline">
            {patient.name}
          </Link>
          <p className="text-xs text-muted">
            {kindLabel(r.kind)} · pediu {waitingSince(r.created_at)}
          </p>
        </div>
      </div>
      <p className="text-sm">“{r.message}”</p>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          respond.mutate({ id: r.id, proposal })
        }}
      >
        <label htmlFor={textId} className="sr-only">
          Sua proposta para {first}
        </label>
        <textarea
          id={textId}
          className="input min-h-20 w-full py-3"
          maxLength={ADJUSTMENT_TEXT_MAX}
          placeholder={`Sua proposta para ${first} (ex.: passamos o treino para sábado)`}
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          required
        />
        {respond.error && <p className="text-sm text-attention">{respond.error.message}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={respond.isPending || !proposal.trim()}>
            Enviar proposta
          </button>
          <Link to={`/pro/mensagens/${patient.id}`} className="btn-outline">
            <MessageSquare className="h-4 w-4" aria-hidden="true" /> Conversar
          </Link>
        </div>
      </form>
    </li>
  )
}
