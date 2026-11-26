-- =============================================================================
-- Skyro · Clubes e desafios da Comunidade
--
--   community_clubs           clube permanente (ex.: "Voltando a treinar")
--   community_club_members    quem participa do clube (entra e sai quando quiser)
--   challenges                desafio de uma semana (segunda a domingo) num clube
--   challenge_participants    quem entrou e a meta pessoal, fixa na rodada
--   challenge_checkins        treinos registrados (no máximo um por dia)
--   challenge_cheers          incentivos entre participantes (um por dia por pessoa)
--   community_posts.challenge_id   post que anuncia um desafio
--
-- Regra do jogo (competição): cumprir a meta pessoal na semana vale 1 ponto.
-- Garantias feitas pelo banco:
--   1. Contas demo só veem e participam de clubes e desafios demo; reais, só reais.
--   2. A meta fica fixa depois de entrar (não há UPDATE). Treino só conta dentro
--      da semana do desafio, até hoje (horário de Brasília), e uma vez por dia.
--   3. Cada um registra, incentiva e sai só em nome próprio. Quem sai de uma
--      rodada não volta nela (senão daria para trocar a meta), e desafio
--      encerrado não muda mais.
--   4. A conta demo da Equipe é pública: só modera conteúdo demo, nunca o real.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois de 20261127000001_comunidade.sql).
-- Pode rodar mais de uma vez.
-- =============================================================================

create or replace function public.today_brt()
returns date
language sql
stable
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

create table if not exists public.community_clubs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) between 2 and 60),
  description  text not null default '' check (length(description) <= 300),
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.community_club_members (
  club_id    uuid not null references public.community_clubs (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.challenges (
  id           uuid primary key default gen_random_uuid(),
  club_id      uuid not null references public.community_clubs (id) on delete cascade,
  created_by   uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (length(btrim(title)) between 3 and 80),
  starts_on    date not null,
  ends_on      date not null,
  created_at   timestamptz not null default now(),
  constraint challenges_uma_semana check (extract(isodow from starts_on) = 1 and ends_on = starts_on + 6)
);
create index if not exists challenges_clube_idx on public.challenges (club_id, starts_on desc);

create table if not exists public.challenge_participants (
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  weekly_goal   smallint not null check (weekly_goal between 1 and 7),
  joined_at     timestamptz not null default now(),
  left_at       timestamptz,
  primary key (challenge_id, user_id)
);
alter table public.challenge_participants add column if not exists left_at timestamptz;

create table if not exists public.challenge_checkins (
  challenge_id   uuid not null references public.challenges (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  activity_date  date not null,
  created_at     timestamptz not null default now(),
  primary key (challenge_id, user_id, activity_date)
);

create table if not exists public.challenge_cheers (
  challenge_id  uuid not null references public.challenges (id) on delete cascade,
  from_user     uuid not null references public.profiles (id) on delete cascade,
  to_user       uuid not null references public.profiles (id) on delete cascade,
  cheer_date    date not null default public.today_brt(),
  created_at    timestamptz not null default now(),
  primary key (challenge_id, from_user, to_user, cheer_date),
  check (from_user <> to_user)
);

alter table public.community_posts
  add column if not exists challenge_id uuid references public.challenges (id) on delete set null;

-- Quem está logado é conta demo?
create or replace function public.viewer_is_demo()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select coalesce((select is_demo from public.profiles where id = auth.uid()), false) $$;

-- Equipe de verdade (a conta demo da Equipe é pública e só mexe em conteúdo demo).
create or replace function public.is_real_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.is_admin() and not public.viewer_is_demo() $$;

-- A Equipe pode moderar o que esta pessoa escreveu? (demo modera demo; real modera tudo)
create or replace function public.can_moderate(p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select public.is_admin() and (public.is_real_admin() or public.same_world(p_author)) $$;

create or replace function public.club_visible(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_clubs c
    where c.id = p_club and (c.is_demo = public.viewer_is_demo() or public.is_real_admin())
  );
$$;

create or replace function public.challenge_visible(p_challenge uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.challenges ch where ch.id = p_challenge and public.club_visible(ch.club_id));
$$;

create or replace function public.is_challenge_participant(p_challenge uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.challenge_visible(p_challenge) and exists (
    select 1 from public.challenge_participants
    where challenge_id = p_challenge and user_id = p_user and left_at is null
  );
$$;

-- O desafio ainda está aberto e o treino cai dentro da semana dele, até hoje?
create or replace function public.checkin_date_ok(p_challenge uuid, p_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.challenges ch
    where ch.id = p_challenge
      and public.club_visible(ch.club_id)
      and ch.ends_on >= public.today_brt()
      and p_date between ch.starts_on and public.today_brt()
  );
$$;

-- Sair de um desafio aberto: apaga os treinos da rodada e não deixa voltar nela.
create or replace function public.leave_challenge(p_challenge uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.challenges ch
    where ch.id = p_challenge and ch.ends_on >= public.today_brt()
  ) then
    raise exception 'desafio_encerrado' using errcode = '42501';
  end if;
  update public.challenge_participants set left_at = now()
  where challenge_id = p_challenge and user_id = auth.uid() and left_at is null;
  if not found then
    raise exception 'nao_participa' using errcode = 'P0002';
  end if;
  delete from public.challenge_checkins where challenge_id = p_challenge and user_id = auth.uid();
end;
$$;

-- Funções auxiliares: só para quem está logado.
revoke execute on function public.viewer_is_demo(), public.is_real_admin(), public.can_moderate(uuid),
  public.club_visible(uuid), public.challenge_visible(uuid), public.is_challenge_participant(uuid, uuid),
  public.checkin_date_ok(uuid, date), public.leave_challenge(uuid) from public, anon;
grant execute on function public.viewer_is_demo(), public.is_real_admin(), public.can_moderate(uuid),
  public.club_visible(uuid), public.challenge_visible(uuid), public.is_challenge_participant(uuid, uuid),
  public.checkin_date_ok(uuid, date), public.leave_challenge(uuid) to authenticated, service_role;

alter table public.community_clubs enable row level security;
alter table public.community_club_members enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.challenge_checkins enable row level security;
alter table public.challenge_cheers enable row level security;

drop policy if exists "clubs: leitura" on public.community_clubs;
drop policy if exists "club_members: leitura" on public.community_club_members;
drop policy if exists "club_members: entrar" on public.community_club_members;
drop policy if exists "club_members: sair" on public.community_club_members;
drop policy if exists "challenges: leitura" on public.challenges;
drop policy if exists "challenges: criar" on public.challenges;
drop policy if exists "challenges: apagar" on public.challenges;
drop policy if exists "challenge_participants: leitura" on public.challenge_participants;
drop policy if exists "challenge_participants: entrar" on public.challenge_participants;
drop policy if exists "challenge_participants: sair" on public.challenge_participants;
drop policy if exists "challenge_checkins: leitura" on public.challenge_checkins;
drop policy if exists "challenge_checkins: registrar" on public.challenge_checkins;
drop policy if exists "challenge_checkins: desfazer" on public.challenge_checkins;
drop policy if exists "challenge_cheers: leitura" on public.challenge_cheers;
drop policy if exists "challenge_cheers: incentivar" on public.challenge_cheers;

create policy "clubs: leitura" on public.community_clubs
  for select to authenticated using (public.club_visible(id));

create policy "club_members: leitura" on public.community_club_members
  for select to authenticated using (public.club_visible(club_id));
create policy "club_members: entrar" on public.community_club_members
  for insert to authenticated with check (user_id = auth.uid() and public.club_visible(club_id));
create policy "club_members: sair" on public.community_club_members
  for delete to authenticated using (user_id = auth.uid());

create policy "challenges: leitura" on public.challenges
  for select to authenticated using (public.club_visible(club_id));
-- Cria desafio quem está no clube, para a semana atual ou a próxima.
create policy "challenges: criar" on public.challenges
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.club_visible(club_id)
    and exists (select 1 from public.community_club_members m where m.club_id = challenges.club_id and m.user_id = auth.uid())
    and starts_on between public.today_brt() - 6 and public.today_brt() + 7
  );
create policy "challenges: apagar" on public.challenges
  for delete to authenticated
  using (public.club_visible(club_id) and (created_by = auth.uid() or public.is_admin()));

create policy "challenge_participants: leitura" on public.challenge_participants
  for select to authenticated using (public.challenge_visible(challenge_id));
create policy "challenge_participants: entrar" on public.challenge_participants
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.challenge_visible(challenge_id)
    and exists (select 1 from public.challenges ch where ch.id = challenge_id and ch.ends_on >= public.today_brt())
  );
-- Sair é pela função leave_challenge (não há DELETE nem UPDATE direto).

create policy "challenge_checkins: leitura" on public.challenge_checkins
  for select to authenticated using (public.challenge_visible(challenge_id));
create policy "challenge_checkins: registrar" on public.challenge_checkins
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_challenge_participant(challenge_id, auth.uid())
    and public.checkin_date_ok(challenge_id, activity_date)
  );
create policy "challenge_checkins: desfazer" on public.challenge_checkins
  for delete to authenticated
  using (user_id = auth.uid() and public.checkin_date_ok(challenge_id, activity_date));

create policy "challenge_cheers: leitura" on public.challenge_cheers
  for select to authenticated using (public.challenge_visible(challenge_id));
create policy "challenge_cheers: incentivar" on public.challenge_cheers
  for insert to authenticated
  with check (
    from_user = auth.uid()
    and cheer_date = public.today_brt()
    and public.is_challenge_participant(challenge_id, auth.uid())
    and public.is_challenge_participant(challenge_id, to_user)
  );

-- Post que anuncia um desafio: só de um desafio que a pessoa vê.
drop policy if exists "community_posts: publicar" on public.community_posts;
create policy "community_posts: publicar" on public.community_posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (cardinality(photos) = 0 or public.is_real_account())
    and (challenge_id is null or public.challenge_visible(challenge_id))
  );

revoke insert, update, delete on public.community_clubs, public.community_club_members, public.challenges,
  public.challenge_participants, public.challenge_checkins, public.challenge_cheers from authenticated, anon;
revoke select on public.community_clubs, public.community_club_members, public.challenges,
  public.challenge_participants, public.challenge_checkins, public.challenge_cheers from anon;
grant select on public.community_clubs, public.community_club_members, public.challenges,
  public.challenge_participants, public.challenge_checkins, public.challenge_cheers to authenticated;
grant insert (club_id, user_id) on public.community_club_members to authenticated;
grant delete on public.community_club_members to authenticated;
grant insert (club_id, created_by, title, starts_on, ends_on) on public.challenges to authenticated;
grant delete on public.challenges to authenticated;
grant insert (challenge_id, user_id, weekly_goal) on public.challenge_participants to authenticated;
grant insert (challenge_id, user_id, activity_date) on public.challenge_checkins to authenticated;
grant delete on public.challenge_checkins to authenticated;
grant insert (challenge_id, from_user, to_user) on public.challenge_cheers to authenticated;
grant insert (challenge_id) on public.community_posts to authenticated;

-- Autores: inclui quem participa de desafios (para mostrar nome no placar).
create or replace view public.community_authors as
  select p.id, p.full_name, p.avatar_seed, p.avatar_path, p.role, pr.specialty, coalesce(pr.verified, false) as verified
  from public.profiles p
  left join public.professionals pr on pr.id = p.id
  where (public.same_world(p.id) or public.is_real_admin())
    and (
      exists (select 1 from public.community_posts cp where cp.author_id = p.id)
      or exists (select 1 from public.community_comments cc where cc.author_id = p.id)
      or exists (select 1 from public.challenge_participants cpt where cpt.user_id = p.id)
    );

-- Moderação do feed: a conta demo da Equipe só lê e apaga conteúdo demo.
drop policy if exists "community_posts: leitura" on public.community_posts;
create policy "community_posts: leitura" on public.community_posts
  for select to authenticated
  using (public.same_world(author_id) or public.is_real_admin());

drop policy if exists "community_posts: apagar" on public.community_posts;
create policy "community_posts: apagar" on public.community_posts
  for delete to authenticated
  using (author_id = auth.uid() or public.can_moderate(author_id));

drop policy if exists "community_comments: apagar" on public.community_comments;
create policy "community_comments: apagar" on public.community_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.can_moderate(author_id));

drop policy if exists "community_reports: leitura" on public.community_reports;
create policy "community_reports: leitura" on public.community_reports
  for select to authenticated
  using (
    reporter_id = auth.uid()
    or (public.is_admin() and exists (select 1 from public.community_posts p where p.id = post_id))
  );

-- Clube inicial para contas reais (o da demo vem no seed 07).
insert into public.community_clubs (id, name, description, is_demo)
values ('c1000000-0000-4000-8000-000000000001', 'Voltando a treinar',
        'Para quem está retomando a rotina de treinos. Desafios semanais com meta pessoal: o descanso faz parte do plano.', false)
on conflict (id) do nothing;
