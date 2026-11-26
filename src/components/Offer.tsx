// A oferta de acompanhamento: como a pessoa lê (perfil e comparação) e como o
// profissional preenche.

import { useId, useState, type ReactNode } from 'react'
import { useSaveOffer } from '../hooks/useOffers'
import {
  ADJUSTMENT_POLICY_MAX,
  CONTACT_OPTIONS,
  initialOffer,
  OFFER_ROWS,
  RESPONSE_OPTIONS,
  responseLabel,
  REVIEW_OPTIONS,
  validateOffer,
  type OfferErrors,
  type ProfessionalOffer,
} from '../lib/offers'
import { Modal } from './ui'

export function OfferDetails({ offer }: { offer: ProfessionalOffer }) {
  return (
    <dl className="divide-y divide-line text-sm">
      {OFFER_ROWS.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-4 py-2">
          <dt className="shrink-0 text-muted">{row.label}</dt>
          <dd className="text-right font-semibold">{row.value(offer)}</dd>
        </div>
      ))}
    </dl>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="mt-1">{children(id)}</div>
      {error && <p className="mt-1 text-sm text-attention">{error}</p>}
    </div>
  )
}

/** Formulário do profissional. Monte só quando aberto, para começar com a oferta atual. */
export function OfferEditor({ offer, onClose }: { offer: ProfessionalOffer | null; onClose: () => void }) {
  const save = useSaveOffer()
  const [values, setValues] = useState(() => initialOffer(offer))
  const [errors, setErrors] = useState<OfferErrors>({})
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((v) => ({ ...v, [key]: value }))

  return (
    <Modal open onClose={onClose} title="Sua oferta de acompanhamento">
      <form
        className="space-y-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          const found = validateOffer(values)
          setErrors(found)
          if (Object.keys(found).length === 0) save.mutate(values, { onSuccess: onClose })
        }}
      >
        <p className="text-sm text-muted">
          É o que a pessoa vê ao comparar profissionais. Escreva o que está de fato incluído na mensalidade.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mensalidade (R$)" error={errors.price}>
            {(id) => (
              <input
                id={id}
                className="input w-full"
                inputMode="decimal"
                placeholder="250"
                value={values.price}
                onChange={(e) => set('price', e.target.value)}
              />
            )}
          </Field>
          <Field label="Encontros por mês" error={errors.meetings}>
            {(id) => (
              <input
                id={id}
                className="input w-full"
                inputMode="numeric"
                placeholder="4"
                value={values.meetings}
                onChange={(e) => set('meetings', e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Quem inicia o contato">
          {(id) => (
            <select id={id} className="input w-full" value={values.contact} onChange={(e) => set('contact', e.target.value as typeof values.contact)}>
              {CONTACT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label.replace('você', 'o cliente').replace('Você procura', 'O cliente procura')}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Revisão do plano">
            {(id) => (
              <select id={id} className="input w-full" value={values.review} onChange={(e) => set('review', e.target.value as typeof values.review)}>
                {REVIEW_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Responde em até">
            {(id) => (
              <select id={id} className="input w-full" value={values.responseHours} onChange={(e) => set('responseHours', Number(e.target.value))}>
                {RESPONSE_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {responseLabel(h)}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="Como funciona o pedido de ajuste (opcional)">
          {(id) => (
            <input
              id={id}
              className="input w-full"
              maxLength={ADJUSTMENT_POLICY_MAX}
              placeholder="Ex.: pelo app, a qualquer momento"
              value={values.adjustmentPolicy}
              onChange={(e) => set('adjustmentPolicy', e.target.value)}
            />
          )}
        </Field>
        {save.error && <p className="text-sm text-attention">Não deu para salvar: {save.error.message}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            Salvar oferta
          </button>
        </div>
      </form>
    </Modal>
  )
}
