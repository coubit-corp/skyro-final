-- Teste de "Meus treinos". Rodar num banco novo com stub + todas as
-- migrations + os seeds. Linhas "deve FALHAR" precisam dar ERROR.
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('fe000000-0000-4000-8000-000000000001', '{"full_name":"Guilherme","role":"person"}'),
  ('fe000000-0000-4000-8000-000000000002', '{"full_name":"Marcelo","role":"person"}'),
  ('fe000000-0000-4000-8000-000000000003', '{"full_name":"Personal","role":"professional"}');
insert into professionals (id, specialty, modality) values ('fe000000-0000-4000-8000-000000000003', 'personal', 'online');
insert into shares (person_id, professional_id) values ('fe000000-0000-4000-8000-000000000001', 'fe000000-0000-4000-8000-000000000003');
set role authenticated;

\echo '== Guilherme =='
set request.jwt.claim.sub = 'fe000000-0000-4000-8000-000000000001';
\echo '-- monta um treino (OK):'
insert into workout_routines (name, exercises) values ('Dia 1', '[{"name":"Supino","muscle":"peito","sets":3,"reps":"10","rest_sec":90}]');
\echo '-- nome vazio (deve FALHAR):'
insert into workout_routines (name) values ('  ');
\echo '-- exercicios que nao sao lista (deve FALHAR):'
insert into workout_routines (name, exercises) values ('x', '{"a":1}');
\echo '-- em nome de outra pessoa (deve FALHAR):'
insert into workout_routines (person_id, name) values ('fe000000-0000-4000-8000-000000000002', 'x');
\echo '-- edita o proprio (OK, esperado Dia A):'
update workout_routines set name = 'Dia A';
select name from workout_routines;
\echo '-- trocar o dono (deve FALHAR):'
update workout_routines set person_id = 'fe000000-0000-4000-8000-000000000002';
\echo '-- registra treino feito no app (OK):'
insert into history_entries (kind, occurred_on, title, source) values ('treino', current_date, 'Dia A', 'skyro');
\echo '-- origem skyro so vale para treino (deve FALHAR):'
insert into history_entries (kind, occurred_on, title, source) values ('marco', current_date, 'x', 'skyro');
\echo '-- limite de 30 treinos montados (deve FALHAR no 31o):'
insert into workout_routines (name) select 'T' || g from generate_series(2, 30) g;
insert into workout_routines (name) values ('T31');
select count(*) from workout_routines;

\echo '== Marcelo =='
set request.jwt.claim.sub = 'fe000000-0000-4000-8000-000000000002';
\echo '-- nao ve os treinos do Guilherme (esperado 0):'
select count(*) from workout_routines;
\echo '-- nao edita nem apaga (esperado UPDATE 0 e DELETE 0):'
update workout_routines set name = 'hack';
delete from workout_routines;

\echo '== Personal (acompanha o Guilherme) =='
set request.jwt.claim.sub = 'fe000000-0000-4000-8000-000000000003';
\echo '-- profissional nao le (esperado 0):'
select count(*) from workout_routines;

\echo '== Demo =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
\echo '-- ve os dois treinos do seed (esperado 2):'
select count(*) from workout_routines;
\echo '-- demo registra treino no app (OK):'
insert into history_entries (kind, occurred_on, title, source, source_key) values ('treino', current_date, 'Treino livre', 'skyro', 't-demo');
\echo '-- demo continua sem importar e sem marco (2x deve FALHAR):'
insert into history_entries (kind, occurred_on, title, source) values ('treino', current_date, 'x', 'hevy');
insert into history_entries (kind, occurred_on, title, source) values ('marco', current_date, 'x', 'manual');
\echo '-- demo apaga so o que registrou no app (esperado DELETE 1, depois DELETE 0):'
delete from history_entries where source_key = 't-demo';
delete from history_entries where source <> 'skyro';

\echo '== Anonimo =='
reset request.jwt.claim.sub;
set role anon;
\echo '-- anonimo nao le (deve FALHAR):'
select count(*) from workout_routines;
reset role;

-- Demo não apaga os treinos de exemplo do seed.
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}', false);
delete from public.history_entries where source = 'skyro' and source_key like 'demo-skyro-%';
select count(*) as exemplos_continuam_2 from public.history_entries where source = 'skyro' and source_key like 'demo-skyro-%';
reset role;

-- Treino do app com formato torto não entra (falha nos quatro).
set role authenticated;
insert into public.history_entries (kind, occurred_on, title, details, source) values ('treino', current_date - 1, 'x', '{}', 'skyro');
insert into public.history_entries (kind, occurred_on, title, details, source) values ('treino', current_date - 1, 'x', '{"exercises":"oi"}', 'skyro');
insert into public.history_entries (kind, occurred_on, title, details, source) values ('treino', current_date - 1, 'x', '{"exercises":[{"name":"a","sets":{}}]}', 'skyro');
insert into public.history_entries (kind, occurred_on, title, details, source) values ('treino', current_date - 1, 'x', '{"exercises":[{"name":"a","sets":[{"reps":"dez"}]}]}', 'skyro');
select count(*) as tortos_0 from public.history_entries where title = 'x';
reset role;
