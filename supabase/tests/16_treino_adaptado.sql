-- Teste do treino adaptado. Rodar num banco novo com stub + todas as
-- migrations + os seeds. Linhas "deve FALHAR" precisam dar ERROR.
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('fc000000-0000-4000-8000-000000000001', '{"full_name":"Pessoa","role":"person"}'),
  ('fc000000-0000-4000-8000-000000000002', '{"full_name":"Outra","role":"person"}'),
  ('fc000000-0000-4000-8000-000000000003', '{"full_name":"Paula Personal","role":"professional"}'),
  ('fc000000-0000-4000-8000-000000000004', '{"full_name":"Nina Nutri","role":"professional"}');
insert into professionals (id, specialty, modality) values
  ('fc000000-0000-4000-8000-000000000003', 'personal', 'online'),
  ('fc000000-0000-4000-8000-000000000004', 'nutricionista', 'online');
insert into shares (person_id, professional_id) values
  ('fc000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-000000000003'),
  ('fc000000-0000-4000-8000-000000000001', 'fc000000-0000-4000-8000-000000000004');
insert into plan_items (id, professional_id, person_id, kind, title, weekdays, sets, reps) values
  ('fc000000-0000-4000-8000-0000000000a1', 'fc000000-0000-4000-8000-000000000003', 'fc000000-0000-4000-8000-000000000001', 'treino', 'Agachamento livre', '{1,2,3,4,5,6,7}', 4, '10');
insert into plan_items (id, professional_id, person_id, kind, title, weekdays, meal_time, foods) values
  ('fc000000-0000-4000-8000-0000000000b1', 'fc000000-0000-4000-8000-000000000004', 'fc000000-0000-4000-8000-000000000001', 'refeicao', 'Almoço', '{1,2,3,4,5,6,7}', '12:30', 'Arroz e feijão');
set role authenticated;

\echo '== Pessoa, sem restricao do personal =='
set request.jwt.claim.sub = 'fc000000-0000-4000-8000-000000000001';
\echo '-- registra a versao curta do treino (OK):'
insert into plan_checks (item_id, person_id, check_date, outcome, adaptation) values ('fc000000-0000-4000-8000-0000000000a1', 'fc000000-0000-4000-8000-000000000001', current_date, 'feito', 'curto');
\echo '-- adaptacao em refeicao (deve FALHAR):'
insert into plan_checks (item_id, person_id, check_date, outcome, adaptation) values ('fc000000-0000-4000-8000-0000000000b1', 'fc000000-0000-4000-8000-000000000001', current_date, 'feito', 'leve');
\echo '-- adaptacao que nao existe (deve FALHAR):'
insert into plan_checks (item_id, person_id, check_date, outcome, adaptation) values ('fc000000-0000-4000-8000-0000000000a1', 'fc000000-0000-4000-8000-000000000001', current_date - 1, 'feito', 'turbo');
\echo '-- pessoa nao define as proprias opcoes (deve FALHAR):'
insert into plan_adaptations (professional_id, person_id, options) values ('fc000000-0000-4000-8000-000000000003', 'fc000000-0000-4000-8000-000000000001', '{leve}');

\echo '== Nina (nutricionista) =='
set request.jwt.claim.sub = 'fc000000-0000-4000-8000-000000000004';
\echo '-- nutricionista nao define opcoes de treino (deve FALHAR):'
insert into plan_adaptations (professional_id, person_id, options) values ('fc000000-0000-4000-8000-000000000004', 'fc000000-0000-4000-8000-000000000001', '{leve}');

\echo '== Paula (personal) =='
set request.jwt.claim.sub = 'fc000000-0000-4000-8000-000000000003';
\echo '-- libera so "Hoje esta dificil" (OK):'
insert into plan_adaptations (professional_id, person_id, options) values ('fc000000-0000-4000-8000-000000000003', 'fc000000-0000-4000-8000-000000000001', '{leve}');
\echo '-- opcao invalida (deve FALHAR):'
update plan_adaptations set options = '{leve,turbo}';
\echo '-- para quem nao compartilha com ela (deve FALHAR):'
insert into plan_adaptations (professional_id, person_id, options) values ('fc000000-0000-4000-8000-000000000003', 'fc000000-0000-4000-8000-000000000002', '{leve}');
\echo '-- ve a versao que a pessoa fez (esperado: curto):'
select adaptation from plan_checks where item_id = 'fc000000-0000-4000-8000-0000000000a1';

\echo '== Pessoa, com restricao =='
set request.jwt.claim.sub = 'fc000000-0000-4000-8000-000000000001';
\echo '-- le as opcoes liberadas (esperado: {leve}):'
select options from plan_adaptations;
\echo '-- versao liberada (OK):'
insert into plan_checks (item_id, person_id, check_date, outcome, adaptation) values ('fc000000-0000-4000-8000-0000000000a1', 'fc000000-0000-4000-8000-000000000001', current_date - 2, 'feito', 'leve');
\echo '-- versao nao liberada (deve FALHAR):'
insert into plan_checks (item_id, person_id, check_date, outcome, adaptation) values ('fc000000-0000-4000-8000-0000000000a1', 'fc000000-0000-4000-8000-000000000001', current_date - 3, 'feito', 'sem_equipamento');
\echo '-- versao normal continua valendo (OK):'
insert into plan_checks (item_id, person_id, check_date, outcome) values ('fc000000-0000-4000-8000-0000000000a1', 'fc000000-0000-4000-8000-000000000001', current_date - 3, 'feito');
\echo '-- pessoa nao muda as opcoes (esperado UPDATE 0 ou FALHAR):'
update plan_adaptations set options = '{curto,sem_equipamento,leve}';

\echo '== anon =='
reset request.jwt.claim.sub;
set role anon;
\echo '-- anon nao le (deve FALHAR):'
select * from plan_adaptations;
reset role;
