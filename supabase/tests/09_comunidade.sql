-- Teste da Comunidade. Rodar num banco novo com stub + todas as migrations +
-- os seeds 01 a 06. Linhas "deve FALHAR" precisam dar ERROR.
-- f9...01 = pessoa real · f9...02 = profissional real · Lucas = pessoa demo
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('f9000000-0000-4000-8000-000000000001', '{"full_name":"Pessoa Real","role":"person"}'),
  ('f9000000-0000-4000-8000-000000000002', '{"full_name":"Pro Real","role":"professional"}');
insert into professionals (id, specialty, modality) values ('f9000000-0000-4000-8000-000000000002', 'personal', 'online');
set role authenticated;

\echo '== pessoa real =='
set request.jwt.claim.sub = 'f9000000-0000-4000-8000-000000000001';
\echo '-- nao ve posts demo (esperado 0):'
select count(*) from community_posts;
\echo '-- publica com foto na propria pasta (OK):'
insert into community_posts (author_id, topic, body, photos)
values (auth.uid(), 'treino', 'Primeiro treino!', array['f9000000-0000-4000-8000-000000000001/1.jpg']);
\echo '-- publica em nome de outro (deve FALHAR):'
insert into community_posts (author_id, body) values ('f9000000-0000-4000-8000-000000000002', 'oi');
\echo '-- foto na pasta de outro (deve FALHAR):'
insert into community_posts (author_id, body, photos) values (auth.uid(), 'oi', array['f9000000-0000-4000-8000-000000000002/1.jpg']);
\echo '-- 5 fotos (deve FALHAR):'
insert into community_posts (author_id, body, photos) values (auth.uid(), 'oi',
  array['f9000000-0000-4000-8000-000000000001/1.jpg','f9000000-0000-4000-8000-000000000001/2.jpg','f9000000-0000-4000-8000-000000000001/3.jpg','f9000000-0000-4000-8000-000000000001/4.jpg','f9000000-0000-4000-8000-000000000001/5.jpg']);
\echo '-- tema invalido (deve FALHAR):'
insert into community_posts (author_id, topic, body) values (auth.uid(), 'outro', 'oi');
\echo '-- edita o post (deve FALHAR):'
update community_posts set body = 'editado';
\echo '-- denuncia o proprio post (deve FALHAR):'
insert into community_reports (post_id, reporter_id) select id, auth.uid() from community_posts;
\echo '-- comenta em post demo (deve FALHAR):'
insert into community_comments (post_id, author_id, body)
select p.id, auth.uid(), 'oi' from community_posts p limit 0;
reset role;
select id as post_demo from community_posts where author_id = 'd0000000-0000-4000-8000-000000000002' limit 1 \gset
set role authenticated;
set request.jwt.claim.sub = 'f9000000-0000-4000-8000-000000000001';
insert into community_comments (post_id, author_id, body) values (:'post_demo', auth.uid(), 'oi');
\echo '-- curte post demo (deve FALHAR):'
insert into community_likes (post_id, user_id) values (:'post_demo', auth.uid());

\echo '== Pro Real =='
set request.jwt.claim.sub = 'f9000000-0000-4000-8000-000000000002';
\echo '-- ve o post da pessoa real (esperado 1):'
select count(*) from community_posts;
\echo '-- ve o autor pela view (esperado Pessoa Real):'
select full_name from community_authors;
\echo '-- curte e comenta (OK):'
insert into community_likes (post_id, user_id) select id, auth.uid() from community_posts;
insert into community_comments (post_id, author_id, body) select id, auth.uid(), 'Boa!' from community_posts;
\echo '-- curte duas vezes (deve FALHAR):'
insert into community_likes (post_id, user_id) select id, auth.uid() from community_posts;
\echo '-- denuncia (OK):'
insert into community_reports (post_id, reporter_id) select id, auth.uid() from community_posts;
\echo '-- apaga o post dos outros (esperado DELETE 0):'
delete from community_posts;

\echo '== Lucas (demo) =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
\echo '-- ve so posts demo (esperado 7, todos os do seed):'
select count(*) from community_posts;
\echo '-- nao ve autores reais (esperado 0):'
select count(*) from community_authors where id::text like 'f9%';
\echo '-- demo publica com foto (deve FALHAR):'
insert into community_posts (author_id, body, photos) values (auth.uid(), 'oi', array['d0000000-0000-4000-8000-000000000001/1.jpg']);
\echo '-- demo publica texto (OK):'
insert into community_posts (author_id, body) values (auth.uid(), 'Bom dia, pessoal!');
\echo '-- nao le denuncias dos outros (esperado 0):'
select count(*) from community_reports;

\echo '== pessoa real apaga o proprio post =='
set request.jwt.claim.sub = 'f9000000-0000-4000-8000-000000000001';
\echo '-- (esperado DELETE 1, e comentarios/curtidas vao junto):'
delete from community_posts where author_id = auth.uid();
reset role;
select count(*) as comentarios_reais_restantes from community_comments where author_id::text like 'f9%';
