-- =============================================================================
-- Skyro · ofertas de acompanhamento demonstrativas
--
-- Dá uma oferta FICTÍCIA a cada profissional demo, variando preço, encontros,
-- quem inicia o contato, frequência da revisão e prazo de resposta, para a
-- comparação lado a lado ter diferenças de verdade.
--
-- Pré-requisito: migration 20261127000004_ofertas.sql.
-- Como rodar: SQL Editor → colar → Run, DEPOIS dos seeds 01 e 02.
-- Pode rodar quantas vezes quiser.
-- =============================================================================

insert into public.professional_offers
  (professional_id, monthly_price_cents, meetings_per_month, contact_initiator, review_frequency, response_hours, adjustment_policy)
select
  p.id,
  (array[18000, 24000, 32000, 45000, 28000, 39000])[1 + n % 6],
  (array[1, 2, 4, 4, 2, 8])[1 + n % 6],
  (array['cliente', 'ambos', 'profissional', 'profissional', 'ambos', 'profissional'])[1 + n % 6],
  (array['mensal', 'quinzenal', 'semanal', 'semanal', 'quinzenal', 'semanal'])[1 + n % 6],
  (array[72, 48, 24, 12, 48, 24])[1 + n % 6],
  (array[
    'Pelo app, respondo no prazo combinado.',
    'Pelo app. Ajustes pequenos saem na hora; os maiores, na revisão.',
    'Pelo app, a qualquer momento. Sem custo extra.',
    'Pelo app ou na conversa. Ajusto no mesmo dia.',
    'Pelo app, até 2 ajustes por mês.',
    'Pelo app, a qualquer momento.'
  ])[1 + n % 6]
from (
  select id, (row_number() over (order by id))::int as n from public.professionals where is_demo
) p
on conflict (professional_id) do update set
  monthly_price_cents = excluded.monthly_price_cents,
  meetings_per_month  = excluded.meetings_per_month,
  contact_initiator   = excluded.contact_initiator,
  review_frequency    = excluded.review_frequency,
  response_hours      = excluded.response_hours,
  adjustment_policy   = excluded.adjustment_policy,
  updated_at          = now();
