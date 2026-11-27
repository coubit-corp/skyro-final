-- =============================================================================
-- Skyro · Nutrição: foto da refeição, substituições, favoritas e macros
--
--   plan_items         refeição ganha calorias e macros opcionais (kcal,
--                      proteína, carboidrato e gordura), se a pessoa vê esses
--                      números (show_macros) e até 5 substituições sugeridas
--   plan_checks        photo_path: foto do que a pessoa comeu
--   meal_favorites     substituições que a pessoa salva para reusar
--   bucket meal-photos fotos das refeições (privado)
--
-- Garantias feitas pelo banco:
--   1. Macros e substituições só existem em item de refeição.
--   2. A foto fica na pasta <pessoa>/<nutricionista>/: só a pessoa envia e
--      apaga; só ela e a nutricionista com compartilhamento ativo veem.
--   3. Conta demo (login público) não envia foto nem salva favorita.
--   4. Favoritas são só de quem salvou: até 30 por pessoa, sem repetir.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois de 20261127000006_meus_treinos.sql;
-- não depende das outras migrations de 28/11).
-- Pode rodar mais de uma vez.
-- =============================================================================

-- ------------------------------------------------------------ itens de refeição
alter table public.plan_items add column if not exists kcal smallint;
alter table public.plan_items add column if not exists protein_g numeric(5, 1);
alter table public.plan_items add column if not exists carbs_g numeric(5, 1);
alter table public.plan_items add column if not exists fat_g numeric(5, 1);
alter table public.plan_items add column if not exists show_macros boolean not null default false;
alter table public.plan_items add column if not exists alternatives text[] not null default '{}';

create or replace function public.valid_meal_alternatives(p text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p) <= 5
     and not exists (select 1 from unnest(p) a where length(btrim(a)) not between 1 and 80);
$$;

alter table public.plan_items drop constraint if exists plan_items_macros;
alter table public.plan_items add constraint plan_items_macros check (
  (kcal is null or kcal between 0 and 5000)
  and (protein_g is null or protein_g between 0 and 500)
  and (carbs_g is null or carbs_g between 0 and 500)
  and (fat_g is null or fat_g between 0 and 500)
);
alter table public.plan_items drop constraint if exists plan_items_macros_so_refeicao;
alter table public.plan_items add constraint plan_items_macros_so_refeicao check (
  kind = 'refeicao'
  or (kcal is null and protein_g is null and carbs_g is null and fat_g is null and not show_macros and cardinality(alternatives) = 0)
);
alter table public.plan_items drop constraint if exists plan_items_substituicoes;
alter table public.plan_items add constraint plan_items_substituicoes check (public.valid_meal_alternatives(alternatives));

-- O update de plan_items é liberado coluna a coluna (20261126000002_permissoes_api.sql).
grant update (kcal, protein_g, carbs_g, fat_g, show_macros, alternatives) on public.plan_items to authenticated;

-- ------------------------------------------------------------ foto da refeição
alter table public.plan_checks add column if not exists photo_path text;
alter table public.plan_checks drop constraint if exists plan_checks_foto;
alter table public.plan_checks add constraint plan_checks_foto check (
  photo_path is null
  or (length(photo_path) <= 200 and split_part(photo_path, '/', 1) = person_id::text)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meal-photos', 'meal-photos', false, 3145728, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "meal-photos: ver" on storage.objects;
drop policy if exists "meal-photos: enviar" on storage.objects;
drop policy if exists "meal-photos: trocar" on storage.objects;
drop policy if exists "meal-photos: apagar" on storage.objects;

-- Pasta <pessoa>/<nutricionista>/arquivo.jpg
create policy "meal-photos: ver" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'meal-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[2] = auth.uid()::text
        and public.has_active_share(((storage.foldername(name))[1])::uuid)
      )
    )
  );

create policy "meal-photos: enviar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_real_account()
  );

create policy "meal-photos: trocar" on storage.objects
  for update to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_real_account());

create policy "meal-photos: apagar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meal-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------ favoritas
create table if not exists public.meal_favorites (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  label       text not null check (length(btrim(label)) between 1 and 80),
  created_at  timestamptz not null default now()
);
create unique index if not exists meal_favorites_unica on public.meal_favorites (person_id, lower(btrim(label)));

create or replace function public.meal_favorites_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.meal_favorites where person_id = new.person_id) >= 30 then
    raise exception 'limite_de_favoritas';
  end if;
  new.label := btrim(new.label);
  return new;
end $$;
revoke execute on function public.meal_favorites_guard() from public, anon, authenticated;

drop trigger if exists meal_favorites_guard on public.meal_favorites;
create trigger meal_favorites_guard
  before insert on public.meal_favorites
  for each row execute function public.meal_favorites_guard();

alter table public.meal_favorites enable row level security;

drop policy if exists "meal_favorites: dono lê" on public.meal_favorites;
create policy "meal_favorites: dono lê" on public.meal_favorites
  for select to authenticated
  using (person_id = auth.uid());

drop policy if exists "meal_favorites: dono cria" on public.meal_favorites;
create policy "meal_favorites: dono cria" on public.meal_favorites
  for insert to authenticated
  with check (person_id = auth.uid() and public.is_real_account());

drop policy if exists "meal_favorites: dono apaga" on public.meal_favorites;
create policy "meal_favorites: dono apaga" on public.meal_favorites
  for delete to authenticated
  using (person_id = auth.uid());

revoke all on public.meal_favorites from anon, authenticated;
grant select, delete on public.meal_favorites to authenticated;
grant insert (label) on public.meal_favorites to authenticated;
