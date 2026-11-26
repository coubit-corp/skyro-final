-- =============================================================================
-- Skyro · Pedido de ajuste: o cliente pede uma mudança no plano, o profissional
-- propõe e o cliente aceita ou recusa
--
--   adjustment_requests   pedido, proposta do profissional e decisão do cliente
--
--   aberto → proposto → aceito | recusado        aberto → cancelado
--
-- Garantias feitas pelo banco:
--   1. Só pede quem tem compartilhamento ATIVO com o profissional (e conta demo
--      só com conta demo), sempre em nome próprio. O pedido é particular: só o
--      cliente e aquele profissional leem (o profissional, enquanto acompanha).
--   2. Ninguém edita a tabela direto: cada passo é uma função que confere quem
--      está chamando e o estado atual do pedido.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois de 20261118000002_mensagens.sql).
-- Pode rodar mais de uma vez.
-- =============================================================================

create table if not exists public.adjustment_requests (
  id               uuid primary key default gen_random_uuid(),
  person_id        uuid not null references public.profiles (id) on delete cascade,
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  kind             text not null check (kind in ('trocar_dia', 'aliviar', 'substituir', 'outro')),
  message          text not null check (length(btrim(message)) between 1 and 500),
  status           text not null default 'aberto'
                   check (status in ('aberto', 'proposto', 'aceito', 'recusado', 'cancelado')),
  proposal         text check (proposal is null or length(btrim(proposal)) between 1 and 500),
  created_at       timestamptz not null default now(),
  responded_at     timestamptz,
  decided_at       timestamptz,
  check (person_id <> professional_id)
);
create index if not exists adjustment_requests_pro_idx on public.adjustment_requests (professional_id, status, created_at);
create index if not exists adjustment_requests_pessoa_idx on public.adjustment_requests (person_id, created_at desc);

alter table public.adjustment_requests enable row level security;

drop policy if exists "adjustment_requests: leitura" on public.adjustment_requests;
drop policy if exists "adjustment_requests: pedir" on public.adjustment_requests;

create policy "adjustment_requests: leitura" on public.adjustment_requests
  for select to authenticated
  using (
    person_id = auth.uid()
    or (professional_id = auth.uid() and public.share_is_active(person_id, professional_id))
  );

create policy "adjustment_requests: pedir" on public.adjustment_requests
  for insert to authenticated
  with check (person_id = auth.uid() and public.can_message(person_id, professional_id));

revoke all on public.adjustment_requests from anon;
revoke insert, update, delete on public.adjustment_requests from authenticated;
grant select on public.adjustment_requests to authenticated;
grant insert (person_id, professional_id, kind, message) on public.adjustment_requests to authenticated;

-- Profissional propõe um ajuste para um pedido aberto.
create or replace function public.respond_adjustment(p_request uuid, p_proposal text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.adjustment_requests r
  set status = 'proposto', proposal = btrim(p_proposal), responded_at = now()
  where r.id = p_request
    and r.professional_id = auth.uid()
    and r.status = 'aberto'
    and public.share_is_active(r.person_id, r.professional_id);
  if not found then
    raise exception 'pedido_indisponivel' using errcode = '42501';
  end if;
end;
$$;

-- Cliente aceita ou recusa a proposta.
create or replace function public.decide_adjustment(p_request uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.adjustment_requests r
  set status = case when p_accept then 'aceito' else 'recusado' end, decided_at = now()
  where r.id = p_request and r.person_id = auth.uid() and r.status = 'proposto';
  if not found then
    raise exception 'pedido_indisponivel' using errcode = '42501';
  end if;
end;
$$;

-- Cliente desiste de um pedido que ainda não teve resposta.
create or replace function public.cancel_adjustment(p_request uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.adjustment_requests r
  set status = 'cancelado', decided_at = now()
  where r.id = p_request and r.person_id = auth.uid() and r.status = 'aberto';
  if not found then
    raise exception 'pedido_indisponivel' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.respond_adjustment(uuid, text), public.decide_adjustment(uuid, boolean),
  public.cancel_adjustment(uuid) from public, anon;
grant execute on function public.respond_adjustment(uuid, text), public.decide_adjustment(uuid, boolean),
  public.cancel_adjustment(uuid) to authenticated, service_role;
