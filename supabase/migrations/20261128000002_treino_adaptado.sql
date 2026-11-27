-- =============================================================================
-- Skyro · Treino adaptado ao dia
--
--   plan_adaptations      opções que o personal libera para a pessoa:
--                         curto ("Tenho 20 minutos"), sem_equipamento
--                         ("Estou sem equipamento") e leve ("Hoje está difícil")
--   plan_checks.adaptation  qual versão a pessoa fez no dia (vazio = a normal)
--
-- Sem linha em plan_adaptations, as três opções valem (o personal ainda não
-- restringiu). Com a linha, só as opções da lista.
--
-- Garantias feitas pelo banco:
--   1. Só o personal com compartilhamento ativo define as opções da pessoa.
--   2. A pessoa lê as opções dela; não as altera.
--   3. A pessoa só registra uma versão adaptada em item de treino, e só uma
--      opção liberada pelo personal que montou o item.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois de 20261128000001_equipe_do_paciente.sql).
-- Pode rodar mais de uma vez.
-- =============================================================================

create table if not exists public.plan_adaptations (
  professional_id  uuid not null references public.professionals (id) on delete cascade,
  person_id        uuid not null references public.profiles (id) on delete cascade,
  options          text[] not null default array['curto', 'sem_equipamento', 'leve'],
  updated_at       timestamptz not null default now(),
  primary key (professional_id, person_id),
  constraint plan_adaptations_opcoes check (options <@ array['curto', 'sem_equipamento', 'leve']::text[])
);

drop trigger if exists plan_adaptations_touch on public.plan_adaptations;
create trigger plan_adaptations_touch
  before update on public.plan_adaptations
  for each row execute function public.touch_updated_at();

alter table public.plan_adaptations enable row level security;

drop policy if exists "plan_adaptations: pessoa lê" on public.plan_adaptations;
create policy "plan_adaptations: pessoa lê" on public.plan_adaptations
  for select to authenticated
  using (person_id = auth.uid());

drop policy if exists "plan_adaptations: personal lê" on public.plan_adaptations;
create policy "plan_adaptations: personal lê" on public.plan_adaptations
  for select to authenticated
  using (professional_id = auth.uid() and public.has_active_share(person_id));

drop policy if exists "plan_adaptations: personal cria" on public.plan_adaptations;
create policy "plan_adaptations: personal cria" on public.plan_adaptations
  for insert to authenticated
  with check (professional_id = auth.uid() and public.can_write_plan(person_id, 'treino'));

drop policy if exists "plan_adaptations: personal edita" on public.plan_adaptations;
create policy "plan_adaptations: personal edita" on public.plan_adaptations
  for update to authenticated
  using (professional_id = auth.uid() and public.can_write_plan(person_id, 'treino'))
  with check (professional_id = auth.uid() and public.can_write_plan(person_id, 'treino'));

revoke all on public.plan_adaptations from anon, authenticated;
grant select on public.plan_adaptations to authenticated;
grant insert (professional_id, person_id, options) on public.plan_adaptations to authenticated;
grant update (options) on public.plan_adaptations to authenticated;

-- Qual versão a pessoa fez.
alter table public.plan_checks add column if not exists adaptation text;
alter table public.plan_checks drop constraint if exists plan_checks_adaptation_check;
alter table public.plan_checks
  add constraint plan_checks_adaptation_check check (adaptation is null or adaptation in ('curto', 'sem_equipamento', 'leve'));

create or replace function public.plan_checks_adaptation_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.plan_items;
  v_options text[];
begin
  if new.adaptation is null then return new; end if;
  select * into v_item from public.plan_items where id = new.item_id;
  if v_item.kind is distinct from 'treino' then
    raise exception 'adaptacao_so_em_treino';
  end if;
  select options into v_options from public.plan_adaptations
   where professional_id = v_item.professional_id and person_id = v_item.person_id;
  if v_options is not null and not (new.adaptation = any (v_options)) then
    raise exception 'adaptacao_nao_liberada';
  end if;
  return new;
end $$;
revoke execute on function public.plan_checks_adaptation_guard() from public, anon, authenticated;

drop trigger if exists plan_checks_adaptation_guard on public.plan_checks;
create trigger plan_checks_adaptation_guard
  before insert or update on public.plan_checks
  for each row execute function public.plan_checks_adaptation_guard();
