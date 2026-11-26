-- Teste dos clubes e desafios. Rodar num banco novo com stub + todas as
-- migrations + os seeds 01 a 07. Linhas "deve FALHAR" precisam dar ERROR.
-- fa...01 = pessoa real · fa...02 = outra pessoa real · Lucas = demo
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('fa000000-0000-4000-8000-000000000001', '{"full_name":"Guilherme","role":"person"}'),
  ('fa000000-0000-4000-8000-000000000002', '{"full_name":"Marcelo","role":"person"}');
select (public.today_brt() - (extract(isodow from public.today_brt())::int - 1)) as seg \gset
set role authenticated;

\echo '== Guilherme (real) =='
set request.jwt.claim.sub = 'fa000000-0000-4000-8000-000000000001';
\echo '-- ve so o clube real (esperado 1):'
select count(*) from community_clubs;
\echo '-- nao ve desafios demo (esperado 0):'
select count(*) from challenges;
\echo '-- cria desafio sem estar no clube (deve FALHAR):'
insert into challenges (club_id, created_by, title, starts_on, ends_on)
values ('c1000000-0000-4000-8000-000000000001', auth.uid(), 'Treinar 3x', :'seg', (:'seg')::date + 6);
\echo '-- entra no clube (OK):'
insert into community_club_members (club_id, user_id) values ('c1000000-0000-4000-8000-000000000001', auth.uid());
\echo '-- desafio que nao comeca na segunda (deve FALHAR):'
insert into challenges (club_id, created_by, title, starts_on, ends_on)
values ('c1000000-0000-4000-8000-000000000001', auth.uid(), 'Treinar 3x', (:'seg')::date + 1, (:'seg')::date + 7);
\echo '-- desafio de um mes atras (deve FALHAR):'
insert into challenges (club_id, created_by, title, starts_on, ends_on)
values ('c1000000-0000-4000-8000-000000000001', auth.uid(), 'Treinar 3x', (:'seg')::date - 28, (:'seg')::date - 22);
\echo '-- cria o desafio da semana (OK):'
insert into challenges (club_id, created_by, title, starts_on, ends_on)
values ('c1000000-0000-4000-8000-000000000001', auth.uid(), 'Treinar 3x', :'seg', (:'seg')::date + 6);
reset role;
select id as ch from challenges where created_by = 'fa000000-0000-4000-8000-000000000001' \gset
select id as ch_demo from challenges where starts_on = :'seg' and club_id = 'c1000000-0000-4000-8000-0000000000d1' \gset
set role authenticated;
set request.jwt.claim.sub = 'fa000000-0000-4000-8000-000000000001';
\echo '-- registra treino sem ter entrado (deve FALHAR):'
insert into challenge_checkins (challenge_id, user_id, activity_date) values (:'ch', auth.uid(), public.today_brt());
\echo '-- meta 8 (deve FALHAR):'
insert into challenge_participants (challenge_id, user_id, weekly_goal) values (:'ch', auth.uid(), 8);
\echo '-- entra com meta 3 (OK):'
insert into challenge_participants (challenge_id, user_id, weekly_goal) values (:'ch', auth.uid(), 3);
\echo '-- muda a meta (deve FALHAR):'
update challenge_participants set weekly_goal = 1;
\echo '-- registra treino hoje (OK):'
insert into challenge_checkins (challenge_id, user_id, activity_date) values (:'ch', auth.uid(), public.today_brt());
\echo '-- registra de novo hoje (deve FALHAR):'
insert into challenge_checkins (challenge_id, user_id, activity_date) values (:'ch', auth.uid(), public.today_brt());
\echo '-- treino amanha (deve FALHAR):'
insert into challenge_checkins (challenge_id, user_id, activity_date) values (:'ch', auth.uid(), public.today_brt() + 1);
\echo '-- treino antes do desafio (deve FALHAR):'
insert into challenge_checkins (challenge_id, user_id, activity_date) values (:'ch', auth.uid(), (:'seg')::date - 1);
\echo '-- entra em desafio demo (deve FALHAR):'
insert into challenge_participants (challenge_id, user_id, weekly_goal) values (:'ch_demo', auth.uid(), 2);
\echo '-- post anunciando desafio demo (deve FALHAR):'
insert into community_posts (author_id, body, challenge_id) values (auth.uid(), 'oi', :'ch_demo');
\echo '-- post anunciando o proprio desafio (OK):'
insert into community_posts (author_id, topic, body, challenge_id) values (auth.uid(), 'treino', 'Quem topa?', :'ch');

\echo '== Marcelo (real) =='
set request.jwt.claim.sub = 'fa000000-0000-4000-8000-000000000002';
\echo '-- entra pelo convite com meta 2, sem estar no clube (OK):'
insert into challenge_participants (challenge_id, user_id, weekly_goal) values (:'ch', auth.uid(), 2);
\echo '-- ve o progresso do Guilherme (esperado 1):'
select count(*) from challenge_checkins where user_id = 'fa000000-0000-4000-8000-000000000001';
\echo '-- incentiva o Guilherme (OK):'
insert into challenge_cheers (challenge_id, from_user, to_user) values (:'ch', auth.uid(), 'fa000000-0000-4000-8000-000000000001');
\echo '-- incentiva de novo hoje (deve FALHAR):'
insert into challenge_cheers (challenge_id, from_user, to_user) values (:'ch', auth.uid(), 'fa000000-0000-4000-8000-000000000001');
\echo '-- incentiva a si mesmo (deve FALHAR):'
insert into challenge_cheers (challenge_id, from_user, to_user) values (:'ch', auth.uid(), auth.uid());
\echo '-- registra treino em nome do Guilherme (deve FALHAR):'
insert into challenge_checkins (challenge_id, user_id, activity_date) values (:'ch', 'fa000000-0000-4000-8000-000000000001', public.today_brt());
\echo '-- apaga treino do Guilherme (esperado DELETE 0):'
delete from challenge_checkins where user_id = 'fa000000-0000-4000-8000-000000000001';
\echo '-- ve o nome do Guilherme pela view (esperado Guilherme):'
select full_name from community_authors where id = 'fa000000-0000-4000-8000-000000000001';
\echo '-- sai do desafio (esperado DELETE 1):'
delete from challenge_participants where user_id = auth.uid();

\echo '== Lucas (demo) =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
\echo '-- ve so o clube demo (esperado 1) e 2 desafios:'
select count(*) from community_clubs;
select count(*) from challenges;
