-- Teste da nutrição detalhada. Rodar num banco novo com stub + todas as
-- migrations + os seeds. Linhas "deve FALHAR" precisam dar ERROR.
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('fb000000-0000-4000-8000-000000000001', '{"full_name":"Pessoa","role":"person"}'),
  ('fb000000-0000-4000-8000-000000000002', '{"full_name":"Outra","role":"person"}'),
  ('fb000000-0000-4000-8000-000000000003', '{"full_name":"Nina Nutri","role":"professional"}'),
  ('fb000000-0000-4000-8000-000000000004', '{"full_name":"Paula Personal","role":"professional"}'),
  ('fb000000-0000-4000-8000-000000000005', '{"full_name":"Demo","role":"person"}');
update profiles set is_demo = true where id = 'fb000000-0000-4000-8000-000000000005';
insert into professionals (id, specialty, modality) values
  ('fb000000-0000-4000-8000-000000000003', 'nutricionista', 'online'),
  ('fb000000-0000-4000-8000-000000000004', 'personal', 'online');
insert into shares (person_id, professional_id) values
  ('fb000000-0000-4000-8000-000000000001', 'fb000000-0000-4000-8000-000000000003'),
  ('fb000000-0000-4000-8000-000000000001', 'fb000000-0000-4000-8000-000000000004');
set role authenticated;

\echo '== Nina (nutricionista) =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000003';
\echo '-- refeicao com macros e substituicoes (OK):'
insert into plan_items (id, professional_id, person_id, kind, title, weekdays, meal_time, foods, kcal, protein_g, carbs_g, fat_g, show_macros, alternatives)
values ('fb000000-0000-4000-8000-0000000000a1', 'fb000000-0000-4000-8000-000000000003', 'fb000000-0000-4000-8000-000000000001', 'refeicao', 'Almoço', '{1,2,3,4,5,6,7}', '12:30', 'Arroz, feijão e frango', 600, 40, 70, 15.5, true, '{"Macarrão com carne","Omelete com salada"}');
\echo '-- edita macros e substituicoes (OK):'
update plan_items set kcal = 650, alternatives = '{"Peixe com legumes"}' where id = 'fb000000-0000-4000-8000-0000000000a1';
\echo '-- kcal absurda (deve FALHAR):'
update plan_items set kcal = 9000 where id = 'fb000000-0000-4000-8000-0000000000a1';
\echo '-- 6 substituicoes (deve FALHAR):'
update plan_items set alternatives = '{a,b,c,d,e,f}' where id = 'fb000000-0000-4000-8000-0000000000a1';
\echo '-- substituicao vazia (deve FALHAR):'
update plan_items set alternatives = '{"  "}' where id = 'fb000000-0000-4000-8000-0000000000a1';

\echo '== Paula (personal) =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000004';
\echo '-- macros em item de treino (deve FALHAR):'
insert into plan_items (professional_id, person_id, kind, title, weekdays, sets, kcal) values ('fb000000-0000-4000-8000-000000000004', 'fb000000-0000-4000-8000-000000000001', 'treino', 'Agachamento', '{1}', 3, 100);

\echo '== Pessoa =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000001';
\echo '-- registra com foto na propria pasta (OK):'
insert into plan_checks (item_id, person_id, check_date, outcome, note, photo_path) values ('fb000000-0000-4000-8000-0000000000a1', 'fb000000-0000-4000-8000-000000000001', current_date, 'substituido', 'Peixe com legumes', 'fb000000-0000-4000-8000-000000000001/fb000000-0000-4000-8000-000000000003/almoco.jpg');
\echo '-- foto na pasta de outra pessoa (deve FALHAR):'
update plan_checks set photo_path = 'fb000000-0000-4000-8000-000000000002/x/almoco.jpg';
\echo '-- envia o arquivo na propria pasta (OK):'
insert into storage.objects (bucket_id, name) values ('meal-photos', 'fb000000-0000-4000-8000-000000000001/fb000000-0000-4000-8000-000000000003/almoco.jpg');
\echo '-- envia arquivo na pasta de outra pessoa (deve FALHAR):'
insert into storage.objects (bucket_id, name) values ('meal-photos', 'fb000000-0000-4000-8000-000000000002/fb000000-0000-4000-8000-000000000003/x.jpg');
\echo '-- salva favorita (OK):'
insert into meal_favorites (label) values ('  Tapioca com ovo ');
\echo '-- favorita repetida, mudando maiuscula (deve FALHAR):'
insert into meal_favorites (label) values ('tapioca com OVO');
\echo '-- favorita em nome de outra pessoa (deve FALHAR):'
insert into meal_favorites (person_id, label) values ('fb000000-0000-4000-8000-000000000002', 'x');
\echo '-- le a favorita sem espacos (esperado: Tapioca com ovo):'
select label from meal_favorites;

\echo '== Nina ve a foto e o registro =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000003';
\echo '-- ve o arquivo (esperado 1):'
select count(*) from storage.objects where bucket_id = 'meal-photos';
\echo '-- nao ve as favoritas da pessoa (esperado 0):'
select count(*) from meal_favorites;

\echo '== Paula (personal) nao ve a foto =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000004';
\echo '-- esperado 0:'
select count(*) from storage.objects where bucket_id = 'meal-photos';

\echo '== Outra pessoa =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000002';
\echo '-- nao ve a foto (esperado 0):'
select count(*) from storage.objects where bucket_id = 'meal-photos';

\echo '== Conta demo =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000005';
\echo '-- demo nao envia foto (deve FALHAR):'
insert into storage.objects (bucket_id, name) values ('meal-photos', 'fb000000-0000-4000-8000-000000000005/x/y.jpg');
\echo '-- demo nao salva favorita (deve FALHAR):'
insert into meal_favorites (label) values ('Pão de queijo');

\echo '== Nina perde o acesso quando a pessoa revoga =='
reset role;
update shares set revoked_at = now() where professional_id = 'fb000000-0000-4000-8000-000000000003';
set role authenticated;
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000003';
\echo '-- esperado 0:'
select count(*) from storage.objects where bucket_id = 'meal-photos';
reset role;
