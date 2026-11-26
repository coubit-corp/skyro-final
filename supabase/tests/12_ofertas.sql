-- Teste das ofertas (Compare). Rodar num banco novo com stub + todas as
-- migrations + os seeds. Linhas "deve FALHAR" precisam dar ERROR.
-- fc...01 = pessoa real · fc...02 = profissional real · fc...03 = outro profissional real
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('fc000000-0000-4000-8000-000000000001', '{"full_name":"Guilherme","role":"person"}'),
  ('fc000000-0000-4000-8000-000000000002', '{"full_name":"Personal Real","role":"professional"}'),
  ('fc000000-0000-4000-8000-000000000003', '{"full_name":"Outro Pro","role":"professional"}');
insert into professionals (id, specialty, modality) values
  ('fc000000-0000-4000-8000-000000000002', 'personal', 'online'),
  ('fc000000-0000-4000-8000-000000000003', 'nutricionista', 'online');
set role authenticated;

\echo '== Personal Real =='
set request.jwt.claim.sub = 'fc000000-0000-4000-8000-000000000002';
\echo '-- cria a propria oferta (OK):'
insert into professional_offers (professional_id, monthly_price_cents, meetings_per_month, contact_initiator, review_frequency, response_hours)
values (auth.uid(), 30000, 4, 'profissional', 'semanal', 24);
\echo '-- cria oferta de outro profissional (deve FALHAR):'
insert into professional_offers (professional_id, monthly_price_cents, meetings_per_month, contact_initiator, review_frequency, response_hours)
values ('fc000000-0000-4000-8000-000000000003', 100, 1, 'cliente', 'mensal', 72);
\echo '-- prazo fora da lista (deve FALHAR):'
update professional_offers set response_hours = 5 where professional_id = auth.uid();
\echo '-- edita a propria (OK, esperado 35000):'
update professional_offers set monthly_price_cents = 35000 where professional_id = auth.uid();
select monthly_price_cents from professional_offers where professional_id = auth.uid();
\echo '-- nao ve ofertas demo (esperado 1):'
select count(*) from professional_offers;

\echo '== Outro Pro =='
set request.jwt.claim.sub = 'fc000000-0000-4000-8000-000000000003';
\echo '-- edita a oferta do colega (esperado 0 linhas alteradas):'
update professional_offers set monthly_price_cents = 1 where professional_id = 'fc000000-0000-4000-8000-000000000002' returning 1;
\echo '-- apaga a oferta do colega (esperado 0 linhas):'
delete from professional_offers where professional_id = 'fc000000-0000-4000-8000-000000000002' returning 1;

\echo '== Guilherme (real) =='
set request.jwt.claim.sub = 'fc000000-0000-4000-8000-000000000001';
\echo '-- ve so a oferta real (esperado 1, 35000):'
select count(*), max(monthly_price_cents) from professional_offers;
\echo '-- pessoa nao cria oferta (deve FALHAR):'
insert into professional_offers (professional_id, monthly_price_cents, meetings_per_month, contact_initiator, review_frequency, response_hours)
values (auth.uid(), 100, 1, 'cliente', 'mensal', 72);

\echo '== Lucas (demo) =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
\echo '-- ve so ofertas demo (esperado > 0 e nenhuma real = 0):'
select count(*) > 0 as tem_demo, count(*) filter (where professional_id::text like 'fc%') as reais from professional_offers;

\echo '== perfil recusado some da comparacao =='
reset role;
update professionals set rejection_reason = 'registro invalido' where id = 'fc000000-0000-4000-8000-000000000002';
set role authenticated;
set request.jwt.claim.sub = 'fc000000-0000-4000-8000-000000000001';
\echo '-- Guilherme nao ve mais (esperado 0):'
select count(*) from professional_offers;
set request.jwt.claim.sub = 'fc000000-0000-4000-8000-000000000002';
\echo '-- o dono continua vendo (esperado 1):'
select count(*) from professional_offers;

\echo '== anonimo (deve FALHAR) =='
reset role; set role anon;
select count(*) from professional_offers;
reset role;
