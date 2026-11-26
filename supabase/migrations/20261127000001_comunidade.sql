-- =============================================================================
-- Skyro · Comunidade: feed com temas, fotos, comentários e curtidas
--
--   community_posts      post com texto, tema e até 4 fotos
--   community_comments   comentários de um post
--   community_likes      curtidas (uma por pessoa por post)
--   community_reports    denúncias (só a Equipe Skyro lê)
--   community_authors    nome, foto e papel de quem escreveu (view)
--   bucket "community"   fotos dos posts (públicas pelo link)
--
-- Garantias feitas pelo banco (não só pela tela):
--   1. Contas demo só veem e escrevem conteúdo demo; contas reais, só real.
--   2. Cada um publica, comenta e curte em nome próprio. Ninguém edita um post
--      ou comentário depois de enviado; o autor (ou a Equipe) apaga.
--   3. Só contas reais enviam fotos, sempre na própria pasta.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois das migrations anteriores).
-- Pode rodar mais de uma vez.
-- =============================================================================

-- Mesmo "mundo" (demo ou real) de quem está logado?
create or replace function public.same_world(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles me, public.profiles other
    where me.id = auth.uid() and other.id = p_user and me.is_demo = other.is_demo
  );
$$;

-- Fotos do post: até 4, sempre na pasta de quem publicou.
create or replace function public.valid_community_photos(p_author uuid, p_photos text[])
returns boolean
language sql
immutable
as $$
  select coalesce(cardinality(p_photos), 0) <= 4
     and not exists (
       select 1 from unnest(coalesce(p_photos, '{}')) as f(path)
       where f.path not like p_author::text || '/%' or f.path ~ '\.\.' or length(f.path) > 120
     );
$$;

create table if not exists public.community_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  topic       text not null default 'geral' check (topic in ('geral', 'nutricao', 'treino', 'mente', 'fisio')),
  body        text not null check (length(btrim(body)) between 1 and 2000),
  photos      text[] not null default '{}',
  created_at  timestamptz not null default now(),
  constraint community_posts_fotos_validas check (public.valid_community_photos(author_id, photos))
);
create index if not exists community_posts_feed_idx on public.community_posts (created_at desc);
create index if not exists community_posts_tema_idx on public.community_posts (topic, created_at desc);

create table if not exists public.community_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.community_posts (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (length(btrim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index if not exists community_comments_post_idx on public.community_comments (post_id, created_at);

create table if not exists public.community_likes (
  post_id     uuid not null references public.community_posts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.community_reports (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.community_posts (id) on delete cascade,
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  reason       text check (reason is null or length(btrim(reason)) between 1 and 300),
  created_at   timestamptz not null default now(),
  unique (post_id, reporter_id)
);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_reports enable row level security;

drop policy if exists "community_posts: leitura" on public.community_posts;
drop policy if exists "community_posts: publicar" on public.community_posts;
drop policy if exists "community_posts: apagar" on public.community_posts;
drop policy if exists "community_comments: leitura" on public.community_comments;
drop policy if exists "community_comments: comentar" on public.community_comments;
drop policy if exists "community_comments: apagar" on public.community_comments;
drop policy if exists "community_likes: leitura" on public.community_likes;
drop policy if exists "community_likes: curtir" on public.community_likes;
drop policy if exists "community_likes: descurtir" on public.community_likes;
drop policy if exists "community_reports: leitura" on public.community_reports;
drop policy if exists "community_reports: denunciar" on public.community_reports;

create policy "community_posts: leitura" on public.community_posts
  for select to authenticated
  using (public.same_world(author_id) or public.is_admin());

create policy "community_posts: publicar" on public.community_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (cardinality(photos) = 0 or public.is_real_account())
  );

create policy "community_posts: apagar" on public.community_posts
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- Comentários e curtidas seguem o post: quem não vê o post não vê nem escreve.
create policy "community_comments: leitura" on public.community_comments
  for select to authenticated
  using (exists (select 1 from public.community_posts p where p.id = post_id));

create policy "community_comments: comentar" on public.community_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (select 1 from public.community_posts p where p.id = post_id and public.same_world(p.author_id))
  );

create policy "community_comments: apagar" on public.community_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create policy "community_likes: leitura" on public.community_likes
  for select to authenticated
  using (exists (select 1 from public.community_posts p where p.id = post_id));

create policy "community_likes: curtir" on public.community_likes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.community_posts p where p.id = post_id and public.same_world(p.author_id))
  );

create policy "community_likes: descurtir" on public.community_likes
  for delete to authenticated
  using (user_id = auth.uid());

create policy "community_reports: leitura" on public.community_reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy "community_reports: denunciar" on public.community_reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (select 1 from public.community_posts p where p.id = post_id and p.author_id <> auth.uid())
  );

revoke insert, update, delete on public.community_posts, public.community_comments,
  public.community_likes, public.community_reports from authenticated, anon;
revoke select on public.community_posts, public.community_comments,
  public.community_likes, public.community_reports from anon;
grant select on public.community_posts, public.community_comments,
  public.community_likes, public.community_reports to authenticated;
grant insert (author_id, topic, body, photos) on public.community_posts to authenticated;
grant delete on public.community_posts to authenticated;
grant insert (post_id, author_id, body) on public.community_comments to authenticated;
grant delete on public.community_comments to authenticated;
grant insert (post_id, user_id) on public.community_likes to authenticated;
grant delete on public.community_likes to authenticated;
grant insert (post_id, reporter_id, reason) on public.community_reports to authenticated;

-- Quem escreveu: a tabela profiles só mostra pessoas para elas mesmas, então
-- esta view expõe só nome, foto e papel de quem publicou ou comentou, e só
-- para quem está no mesmo mundo (demo ou real).
create or replace view public.community_authors as
  select p.id, p.full_name, p.avatar_seed, p.avatar_path, p.role, pr.specialty, coalesce(pr.verified, false) as verified
  from public.profiles p
  left join public.professionals pr on pr.id = p.id
  where (public.same_world(p.id) or public.is_admin())
    and (
      exists (select 1 from public.community_posts cp where cp.author_id = p.id)
      or exists (select 1 from public.community_comments cc where cc.author_id = p.id)
    );

revoke all on public.community_authors from anon;
grant select on public.community_authors to authenticated;

-- Fotos dos posts (Supabase Storage): reduzidas no aparelho antes do envio.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community', 'community', true, 3145728, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "community: listar a própria pasta" on storage.objects;
drop policy if exists "community: enviar na própria pasta" on storage.objects;
drop policy if exists "community: apagar da própria pasta" on storage.objects;

create policy "community: listar a própria pasta" on storage.objects
  for select to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "community: enviar na própria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'community'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_real_account()
  );

create policy "community: apagar da própria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = auth.uid()::text);
