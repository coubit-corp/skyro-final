-- =============================================================================
-- Skyro · Corrida: corridas importadas ou registradas e plano progressivo
--
--   history_entries   ganha a origem 'corrida': corrida (ou caminhada/pedal)
--                     importada de arquivo GPX/TCX (Strava, Garmin…) ou
--                     registrada à mão. Formato fixo em details.
--   running_plans     plano de corrida da pessoa: objetivo (5, 10 ou 21 km),
--                     dias por semana, nível e data de início. As sessões são
--                     calculadas no app a partir disso.
--
-- Garantias feitas pelo banco:
--   1. Corrida tem formato fixo (esporte, distância, duração, subida, origem).
--   2. Repetir o mesmo arquivo não duplica (person_id, source, source_key).
--   3. Cada pessoa só lê e muda o próprio plano; o profissional com
--      compartilhamento ativo lê o plano para acompanhar.
--   4. Conta demo (login público): registra corrida como registra treino no
--      app, e só apaga o que um visitante criou (os exemplos do seed ficam).
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois de 20261127000006_meus_treinos.sql;
-- não depende das outras migrations de 28/11). Pode rodar mais de uma vez.
-- =============================================================================

alter table public.history_entries drop constraint if exists history_entries_source_check;
alter table public.history_entries
  add constraint history_entries_source_check check (source in ('hevy', 'manual', 'skyro', 'corrida'));

create or replace function public.running_details_ok(d jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(d) is distinct from 'object' then return false; end if;
  if coalesce(d ->> 'sport', '') not in ('corrida', 'caminhada', 'pedal') then return false; end if;
  if coalesce(d ->> 'origin', '') not in ('gpx', 'tcx', 'manual') then return false; end if;
  if jsonb_typeof(d -> 'distance_km') is distinct from 'number'
     or (d ->> 'distance_km')::numeric not between 0 and 500 then return false; end if;
  if jsonb_typeof(d -> 'duration_min') is distinct from 'number'
     or (d ->> 'duration_min')::numeric not between 1 and 1440 then return false; end if;
  if d ? 'elevation_m' and (jsonb_typeof(d -> 'elevation_m') <> 'number'
     or (d ->> 'elevation_m')::numeric not between 0 and 20000) then return false; end if;
  return true;
end;
$$;

alter table public.history_entries drop constraint if exists history_entries_corrida_formato;
alter table public.history_entries
  add constraint history_entries_corrida_formato check (
    source <> 'corrida' or (kind = 'treino' and public.running_details_ok(details))
  );

drop policy if exists "history_entries: criar" on public.history_entries;
create policy "history_entries: criar" on public.history_entries
  for insert to authenticated
  with check (
    person_id = auth.uid()
    and occurred_on <= public.today_brt()
    and (source in ('skyro', 'corrida') or not public.viewer_is_demo())
  );

drop policy if exists "history_entries: apagar" on public.history_entries;
create policy "history_entries: apagar" on public.history_entries
  for delete to authenticated
  using (
    person_id = auth.uid()
    and (
      not public.viewer_is_demo()
      -- Demo (login público): só o que um visitante registrou; os exemplos do seed ficam.
      or (source in ('skyro', 'corrida') and source_key not like 'demo-%')
    )
  );

-- ------------------------------------------------------------ plano de corrida
create table if not exists public.running_plans (
  person_id      uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  goal           text not null check (goal in ('5k', '10k', '21k')),
  days_per_week  smallint not null check (days_per_week between 2 and 4),
  level          text not null check (level in ('iniciante', 'intermediario')),
  starts_on      date not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint running_plans_inicio check (starts_on between date '2024-01-01' and date '2100-01-01')
);

drop trigger if exists running_plans_touch on public.running_plans;
create trigger running_plans_touch
  before update on public.running_plans
  for each row execute function public.touch_updated_at();

alter table public.running_plans enable row level security;

drop policy if exists "running_plans: dono" on public.running_plans;
create policy "running_plans: dono" on public.running_plans
  for all to authenticated
  using (person_id = auth.uid())
  with check (person_id = auth.uid());

drop policy if exists "running_plans: profissional lê" on public.running_plans;
create policy "running_plans: profissional lê" on public.running_plans
  for select to authenticated
  using (public.has_active_share(person_id));

revoke all on public.running_plans from anon, authenticated;
grant select, delete on public.running_plans to authenticated;
grant insert (goal, days_per_week, level, starts_on) on public.running_plans to authenticated;
grant update (goal, days_per_week, level, starts_on) on public.running_plans to authenticated;
