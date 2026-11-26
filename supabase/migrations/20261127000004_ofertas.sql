-- =============================================================================
-- Skyro · Compare: a oferta de acompanhamento de cada profissional
--
--   professional_offers   uma por profissional: mensalidade, encontros, quem
--                         inicia o contato, frequência da revisão, prazo de
--                         resposta e como funciona o pedido de ajuste
--
-- Garantias feitas pelo banco:
--   1. Só o próprio profissional escreve a sua oferta.
--   2. Lê a oferta quem pode ver o profissional (a mesma regra da busca) e
--      conta demo só vê oferta de profissional demo, e conta real só de real.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois de 20261127000001_comunidade.sql,
-- que cria same_world). Pode rodar mais de uma vez.
-- =============================================================================

create table if not exists public.professional_offers (
  professional_id     uuid primary key references public.professionals (id) on delete cascade,
  monthly_price_cents integer not null check (monthly_price_cents between 0 and 10000000),
  meetings_per_month  smallint not null check (meetings_per_month between 0 and 31),
  contact_initiator   text not null check (contact_initiator in ('profissional', 'cliente', 'ambos')),
  review_frequency    text not null check (review_frequency in ('semanal', 'quinzenal', 'mensal')),
  response_hours      smallint not null check (response_hours in (12, 24, 48, 72)),
  adjustment_policy   text not null default '' check (length(adjustment_policy) <= 200),
  updated_at          timestamptz not null default now()
);

alter table public.professional_offers enable row level security;

drop policy if exists "professional_offers: leitura" on public.professional_offers;
drop policy if exists "professional_offers: criar a própria" on public.professional_offers;
drop policy if exists "professional_offers: editar a própria" on public.professional_offers;
drop policy if exists "professional_offers: apagar a própria" on public.professional_offers;

-- O "exists" passa pelo RLS de professionals: perfil recusado some junto.
create policy "professional_offers: leitura" on public.professional_offers
  for select to authenticated
  using (
    professional_id = auth.uid()
    or (
      public.same_world(professional_id)
      and exists (select 1 from public.professionals p where p.id = professional_id)
    )
  );

create policy "professional_offers: criar a própria" on public.professional_offers
  for insert to authenticated
  with check (professional_id = auth.uid());

create policy "professional_offers: editar a própria" on public.professional_offers
  for update to authenticated
  using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

create policy "professional_offers: apagar a própria" on public.professional_offers
  for delete to authenticated
  using (professional_id = auth.uid());

revoke all on public.professional_offers from anon;
revoke all on public.professional_offers from authenticated;
grant select, delete on public.professional_offers to authenticated;
grant insert (professional_id, monthly_price_cents, meetings_per_month, contact_initiator, review_frequency,
              response_hours, adjustment_policy, updated_at) on public.professional_offers to authenticated;
grant update (monthly_price_cents, meetings_per_month, contact_initiator, review_frequency,
              response_hours, adjustment_policy, updated_at) on public.professional_offers to authenticated;
