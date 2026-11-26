-- =============================================================================
-- Skyro · Minha Evolução: histórico que a pessoa traz de fora
--
--   history_entries   treinos importados (Hevy) e marcos escritos pela pessoa
--
-- Garantias feitas pelo banco:
--   1. Cada pessoa só lê, cria e apaga o próprio histórico. Profissional não lê:
--      compartilhar esse histórico fica para uma próxima etapa.
--   2. Repetir o mesmo arquivo não duplica: (person_id, source, source_key) é único.
--   3. Guarda a origem (source) e a data original (occurred_on), nunca no futuro.
--   4. Não entra em desafio: os pontos da rodada vêm só de challenge_checkins.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois de 20261127000002_desafios.sql).
-- Pode rodar mais de uma vez.
-- =============================================================================

create table if not exists public.history_entries (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('treino', 'marco')),
  occurred_on  date not null check (occurred_on >= date '1970-01-01'),
  title        text not null check (length(btrim(title)) between 1 and 120),
  -- treino: { "duration_min": 55, "exercises": [{ "name": "...", "sets": [{ "reps": 10, "weight_kg": 40 }] }] }
  details      jsonb not null default '{}'::jsonb check (pg_column_size(details) <= 30000),
  source       text not null check (source in ('hevy', 'manual')),
  source_key   text not null default gen_random_uuid()::text check (length(source_key) between 1 and 200),
  created_at   timestamptz not null default now(),
  constraint history_entries_sem_duplicata unique (person_id, source, source_key)
);
create index if not exists history_entries_pessoa_idx on public.history_entries (person_id, occurred_on desc);

alter table public.history_entries enable row level security;

drop policy if exists "history_entries: leitura" on public.history_entries;
drop policy if exists "history_entries: criar" on public.history_entries;
drop policy if exists "history_entries: apagar" on public.history_entries;

create policy "history_entries: leitura" on public.history_entries
  for select to authenticated
  using (person_id = auth.uid());

create policy "history_entries: criar" on public.history_entries
  for insert to authenticated
  with check (person_id = auth.uid() and occurred_on <= public.today_brt());

create policy "history_entries: apagar" on public.history_entries
  for delete to authenticated
  using (person_id = auth.uid());

revoke all on public.history_entries from anon, authenticated;
grant select, delete on public.history_entries to authenticated;
grant insert (kind, occurred_on, title, details, source, source_key) on public.history_entries to authenticated;
