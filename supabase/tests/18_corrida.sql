-- Teste da corrida. Rodar num banco novo com stub + todas as migrations +
-- os seeds. Linhas "deve FALHAR" precisam dar ERROR.
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('fa000000-0000-4000-8000-000000000001', '{"full_name":"Corredora","role":"person"}'),
  ('fa000000-0000-4000-8000-000000000002', '{"full_name":"Outra","role":"person"}'),
  ('fa000000-0000-4000-8000-000000000003', '{"full_name":"Paula Personal","role":"professional"}'),
  ('fa000000-0000-4000-8000-000000000004', '{"full_name":"Demo","role":"person"}');
update profiles set is_demo = true where id = 'fa000000-0000-4000-8000-000000000004';
insert into professionals (id, specialty, modality) values ('fa000000-0000-4000-8000-000000000003', 'personal', 'online');
insert into shares (person_id, professional_id) values ('fa000000-0000-4000-8000-000000000001', 'fa000000-0000-4000-8000-000000000003');
-- Exemplo do seed na conta demo (não pode ser apagado pela demo).
insert into history_entries (person_id, kind, occurred_on, title, details, source, source_key) values
  ('fa000000-0000-4000-8000-000000000004', 'treino', current_date - 2, 'Corrida', '{"sport":"corrida","origin":"manual","distance_km":5,"duration_min":32}', 'corrida', 'demo-corrida-1');
set role authenticated;

\echo '== Corredora =='
set request.jwt.claim.sub = 'fa000000-0000-4000-8000-000000000001';
\echo '-- importa corrida de GPX (OK):'
insert into history_entries (kind, occurred_on, title, details, source, source_key) values ('treino', current_date - 1, 'Corrida no parque', '{"sport":"corrida","origin":"gpx","distance_km":5.2,"duration_min":31.5,"elevation_m":42}', 'corrida', '2026-11-26T09:00:00Z');
\echo '-- o mesmo arquivo de novo (deve FALHAR: duplicado):'
insert into history_entries (kind, occurred_on, title, details, source, source_key) values ('treino', current_date - 1, 'Corrida no parque', '{"sport":"corrida","origin":"gpx","distance_km":5.2,"duration_min":31.5}', 'corrida', '2026-11-26T09:00:00Z');
\echo '-- registra a mao (OK):'
insert into history_entries (kind, occurred_on, title, details, source) values ('treino', current_date, 'Corrida', '{"sport":"corrida","origin":"manual","distance_km":3,"duration_min":20}', 'corrida');
\echo '-- sem distancia (deve FALHAR):'
insert into history_entries (kind, occurred_on, title, details, source) values ('treino', current_date, 'x', '{"sport":"corrida","origin":"manual","duration_min":20}', 'corrida');
\echo '-- esporte desconhecido (deve FALHAR):'
insert into history_entries (kind, occurred_on, title, details, source) values ('treino', current_date, 'x', '{"sport":"natacao","origin":"manual","distance_km":1,"duration_min":20}', 'corrida');
\echo '-- duracao zero (deve FALHAR):'
insert into history_entries (kind, occurred_on, title, details, source) values ('treino', current_date, 'x', '{"sport":"corrida","origin":"manual","distance_km":1,"duration_min":0}', 'corrida');
\echo '-- corrida no futuro (deve FALHAR):'
insert into history_entries (kind, occurred_on, title, details, source) values ('treino', current_date + 2, 'x', '{"sport":"corrida","origin":"manual","distance_km":1,"duration_min":10}', 'corrida');
\echo '-- cria o plano de 5 km (OK):'
insert into running_plans (goal, days_per_week, level, starts_on) values ('5k', 3, 'iniciante', current_date);
\echo '-- muda o plano (OK):'
update running_plans set goal = '10k';
\echo '-- objetivo invalido (deve FALHAR):'
update running_plans set goal = '42k';
\echo '-- 5 dias por semana (deve FALHAR):'
update running_plans set days_per_week = 5;
\echo '-- plano em nome de outra pessoa (deve FALHAR):'
insert into running_plans (person_id, goal, days_per_week, level, starts_on) values ('fa000000-0000-4000-8000-000000000002', '5k', 3, 'iniciante', current_date);

\echo '== Paula (personal) =='
set request.jwt.claim.sub = 'fa000000-0000-4000-8000-000000000003';
\echo '-- le o plano da paciente (esperado: 10k):'
select goal from running_plans;
\echo '-- nao muda o plano (esperado UPDATE 0):'
update running_plans set goal = '21k';

\echo '== Outra pessoa =='
set request.jwt.claim.sub = 'fa000000-0000-4000-8000-000000000002';
\echo '-- nao ve plano nem corridas da outra (esperado 0 e 0):'
select count(*) from running_plans;
select count(*) from history_entries where source = 'corrida';

\echo '== Demo =='
set request.jwt.claim.sub = 'fa000000-0000-4000-8000-000000000004';
\echo '-- registra corrida (OK):'
insert into history_entries (kind, occurred_on, title, details, source, source_key) values ('treino', current_date, 'Corrida', '{"sport":"corrida","origin":"manual","distance_km":2,"duration_min":15}', 'corrida', 'visitante-1');
\echo '-- apaga a que registrou (esperado DELETE 1):'
delete from history_entries where source_key = 'visitante-1';
\echo '-- nao apaga o exemplo do seed (esperado DELETE 0):'
delete from history_entries where source_key = 'demo-corrida-1';
\echo '-- demo continua sem importar do Hevy (deve FALHAR):'
insert into history_entries (kind, occurred_on, title, details, source) values ('treino', current_date, 'x', '{}', 'hevy');

\echo '== anon =='
reset request.jwt.claim.sub;
set role anon;
\echo '-- anon nao le planos (deve FALHAR):'
select * from running_plans;
reset role;
