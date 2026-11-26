-- =============================================================================
-- Skyro · Meus treinos: a pessoa monta e registra os próprios treinos
--
--   workout_routines   treinos que a própria pessoa montou (ex.: "Dia 1")
--   history_entries    ganha a origem 'skyro': treino registrado série a série no app
--
-- Garantias feitas pelo banco:
--   1. Cada pessoa só lê, cria, edita e apaga os próprios treinos. Profissional não lê.
--   2. No máximo 30 treinos montados por pessoa.
--   3. Conta demo (login público): pode montar e registrar treino no app, como já
--      faz com a rotina do dia, mas continua sem importar arquivo nem criar marco.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois de 20261127000005_evolucao.sql).
-- Pode rodar mais de uma vez.
-- =============================================================================

create table if not exists public.workout_routines (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 60),
  -- [{ "name": "Supino inclinado (máquina)", "muscle": "peito", "sets": 4, "reps": "8-10", "rest_sec": 120 }]
  exercises   jsonb not null default '[]'::jsonb
              check (jsonb_typeof(exercises) = 'array' and jsonb_array_length(exercises) <= 30
                     and pg_column_size(exercises) <= 12000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists workout_routines_pessoa_idx on public.workout_routines (person_id, created_at);

create or replace function public.workout_routines_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.workout_routines where person_id = new.person_id) >= 30 then
      raise exception 'limite_de_treinos';
    end if;
  else
    new.person_id := old.person_id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end $$;
revoke execute on function public.workout_routines_guard() from public, anon, authenticated;

drop trigger if exists workout_routines_guard on public.workout_routines;
create trigger workout_routines_guard
  before insert or update on public.workout_routines
  for each row execute function public.workout_routines_guard();

alter table public.workout_routines enable row level security;

drop policy if exists "workout_routines: dono" on public.workout_routines;
create policy "workout_routines: dono" on public.workout_routines
  for all to authenticated
  using (person_id = auth.uid())
  with check (person_id = auth.uid());

revoke all on public.workout_routines from anon, authenticated;
grant select, delete on public.workout_routines to authenticated;
grant insert (name, exercises), update (name, exercises) on public.workout_routines to authenticated;

-- Treino registrado no app entra no mesmo histórico dos importados.
alter table public.history_entries drop constraint if exists history_entries_source_check;
alter table public.history_entries
  add constraint history_entries_source_check check (source in ('hevy', 'manual', 'skyro'));
alter table public.history_entries drop constraint if exists history_entries_skyro_e_treino;
alter table public.history_entries
  add constraint history_entries_skyro_e_treino check (source <> 'skyro' or kind = 'treino');

drop policy if exists "history_entries: criar" on public.history_entries;
drop policy if exists "history_entries: apagar" on public.history_entries;

create policy "history_entries: criar" on public.history_entries
  for insert to authenticated
  with check (
    person_id = auth.uid()
    and occurred_on <= public.today_brt()
    and (source = 'skyro' or not public.viewer_is_demo())
  );

create policy "history_entries: apagar" on public.history_entries
  for delete to authenticated
  using (
    person_id = auth.uid()
    and (
      not public.viewer_is_demo()
      -- Demo (login público): só o treino que um visitante registrou; os exemplos do seed ficam.
      or (source = 'skyro' and source_key not like 'demo-skyro-%')
    )
  );
