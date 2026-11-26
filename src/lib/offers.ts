// Oferta de acompanhamento do profissional (Skyro Compare): o que está
// incluído na mensalidade, em termos que dá para comparar lado a lado.

export type ContactInitiator = 'profissional' | 'cliente' | 'ambos'
export type ReviewFrequency = 'semanal' | 'quinzenal' | 'mensal'

export interface ProfessionalOffer {
  professional_id: string
  monthly_price_cents: number
  meetings_per_month: number
  contact_initiator: ContactInitiator
  review_frequency: ReviewFrequency
  response_hours: number
  adjustment_policy: string
  updated_at: string
}

export const CONTACT_OPTIONS: { value: ContactInitiator; label: string }[] = [
  { value: 'profissional', label: 'O profissional procura você' },
  { value: 'cliente', label: 'Você procura o profissional' },
  { value: 'ambos', label: 'Os dois, quando precisar' },
]

export const REVIEW_OPTIONS: { value: ReviewFrequency; label: string }[] = [
  { value: 'semanal', label: 'Toda semana' },
  { value: 'quinzenal', label: 'A cada 15 dias' },
  { value: 'mensal', label: 'Uma vez por mês' },
]

export const RESPONSE_OPTIONS = [12, 24, 48, 72] as const
export const ADJUSTMENT_POLICY_MAX = 200
export const MAX_COMPARE = 3

export function contactLabel(v: ContactInitiator): string {
  return CONTACT_OPTIONS.find((o) => o.value === v)?.label ?? v
}

export function reviewLabel(v: ReviewFrequency): string {
  return REVIEW_OPTIONS.find((o) => o.value === v)?.label ?? v
}

export function responseLabel(hours: number): string {
  return hours % 24 === 0 ? (hours === 24 ? '1 dia' : `${hours / 24} dias`) : `${hours} horas`
}

export function meetingsLabel(n: number): string {
  if (n === 0) return 'Sem encontros, só pelo app'
  return n === 1 ? '1 encontro por mês' : `${n} encontros por mês`
}

/** "R$ 240" ou "R$ 249,90"; 0 vira "Gratuito". */
export function formatPrice(cents: number): string {
  if (cents === 0) return 'Gratuito'
  const value = (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
  return `R$ ${value}`
}

/** "249,90", "R$ 1.200" ou "300" → centavos. null se não for um valor válido. */
export function parsePrice(text: string): number | null {
  const clean = text.replace(/R\$|\s/g, '')
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(clean)) return null
  const cents = Math.round(Number(clean.replace(/\./g, '').replace(',', '.')) * 100)
  return Number.isFinite(cents) && cents <= 10_000_000 ? cents : null
}

/** As linhas da oferta, na mesma ordem em todo lugar (perfil e comparação). */
export const OFFER_ROWS: { label: string; value: (o: ProfessionalOffer) => string }[] = [
  { label: 'Mensalidade', value: (o) => formatPrice(o.monthly_price_cents) },
  { label: 'Encontros', value: (o) => meetingsLabel(o.meetings_per_month) },
  { label: 'Quem inicia o contato', value: (o) => contactLabel(o.contact_initiator) },
  { label: 'Revisão do plano', value: (o) => reviewLabel(o.review_frequency) },
  { label: 'Responde em até', value: (o) => responseLabel(o.response_hours) },
  { label: 'Pedido de ajuste', value: (o) => o.adjustment_policy || 'Não informado' },
]

export interface OfferValues {
  price: string
  meetings: string
  contact: ContactInitiator
  review: ReviewFrequency
  responseHours: number
  adjustmentPolicy: string
}

export type OfferErrors = Partial<Record<'price' | 'meetings', string>>

export function initialOffer(offer?: ProfessionalOffer | null): OfferValues {
  return {
    price: offer ? formatPrice(offer.monthly_price_cents).replace(/^R\$ |Gratuito/, '') || '0' : '',
    meetings: offer ? String(offer.meetings_per_month) : '',
    contact: offer?.contact_initiator ?? 'ambos',
    review: offer?.review_frequency ?? 'quinzenal',
    responseHours: offer?.response_hours ?? 24,
    adjustmentPolicy: offer?.adjustment_policy ?? '',
  }
}

export function validateOffer(v: OfferValues): OfferErrors {
  const errors: OfferErrors = {}
  if (parsePrice(v.price) == null) errors.price = 'Informe a mensalidade em reais (ex.: 250 ou 249,90).'
  const meetings = Number(v.meetings)
  if (!/^\d+$/.test(v.meetings.trim()) || meetings > 31) errors.meetings = 'Informe de 0 a 31 encontros por mês.'
  return errors
}

export function toOfferRow(professionalId: string, v: OfferValues) {
  return {
    professional_id: professionalId,
    monthly_price_cents: parsePrice(v.price)!,
    meetings_per_month: Number(v.meetings),
    contact_initiator: v.contact,
    review_frequency: v.review,
    response_hours: v.responseHours,
    adjustment_policy: v.adjustmentPolicy.trim(),
    updated_at: new Date().toISOString(),
  }
}

/** Ids da URL (?ids=a,b,c): só os que existem na lista, sem repetir, até 3. */
export function parseCompareIds(param: string | null, available: string[]): string[] {
  const valid = new Set(available)
  return [...new Set((param ?? '').split(',').filter((id) => valid.has(id)))].slice(0, MAX_COMPARE)
}

/** Liga ou desliga um profissional na comparação; com 3 escolhidos, não entra um quarto. */
export function toggleCompare(selected: string[], id: string): string[] {
  if (selected.includes(id)) return selected.filter((x) => x !== id)
  return selected.length >= MAX_COMPARE ? selected : [...selected, id]
}
