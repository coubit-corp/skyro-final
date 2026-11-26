-- Teste dos pedidos de ajuste. Rodar num banco novo com stub + todas as
-- migrations + os seeds. Linhas "deve FALHAR" precisam dar ERROR.
-- fb...01 = pessoa real · fb...02 = profissional real · fb...03 = outro profissional real
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('fb000000-0000-4000-8000-000000000001', '{"full_name":"Guilherme","role":"person"}'),
  ('fb000000-0000-4000-8000-000000000002', '{"full_name":"Personal Real","role":"professional"}'),
  ('fb000000-0000-4000-8000-000000000003', '{"full_name":"Outro Pro","role":"professional"}');
insert into professionals (id, specialty, modality) values
  ('fb000000-0000-4000-8000-000000000002', 'personal', 'online'),
  ('fb000000-0000-4000-8000-000000000003', 'nutricionista', 'online');
insert into shares (person_id, professional_id) values
  ('fb000000-0000-4000-8000-000000000001', 'fb000000-0000-4000-8000-000000000002');
set role authenticated;

\echo '== Guilherme =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000001';
\echo '-- pede ajuste ao personal dele (OK):'
insert into adjustment_requests (person_id, professional_id, kind, message)
values (auth.uid(), 'fb000000-0000-4000-8000-000000000002', 'trocar_dia', 'Quarta não consigo treinar.');
\echo '-- pede a quem nao acompanha (deve FALHAR):'
insert into adjustment_requests (person_id, professional_id, kind, message)
values (auth.uid(), 'fb000000-0000-4000-8000-000000000003', 'outro', 'Oi');
\echo '-- pede ja com status aceito (deve FALHAR):'
insert into adjustment_requests (person_id, professional_id, kind, message, status)
values (auth.uid(), 'fb000000-0000-4000-8000-000000000002', 'outro', 'Oi', 'aceito');
\echo '-- edita direto (deve FALHAR):'
update adjustment_requests set status = 'aceito';
\echo '-- aceita antes de ter proposta (deve FALHAR):'
select public.decide_adjustment(id, true) from adjustment_requests where person_id = auth.uid();
\echo '-- responde o proprio pedido como se fosse o profissional (deve FALHAR):'
select public.respond_adjustment(id, 'Sábado') from adjustment_requests where person_id = auth.uid();
\echo '-- nao ve pedidos dos outros (esperado 1):'
select count(*) from adjustment_requests;

\echo '== Outro Pro =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000003';
\echo '-- nao ve o pedido (esperado 0):'
select count(*) from adjustment_requests;
reset role;
select id as req from adjustment_requests where person_id = 'fb000000-0000-4000-8000-000000000001' \gset
set role authenticated;
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000003';
\echo '-- responde pedido de outro profissional (deve FALHAR):'
select public.respond_adjustment(:'req', 'Sábado');

\echo '== Personal Real =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000002';
\echo '-- ve o pedido (esperado 1) e propoe sabado (OK):'
select count(*) from adjustment_requests;
select public.respond_adjustment(:'req', 'Vamos passar para sábado de manhã.');
\echo '-- propoe de novo (deve FALHAR):'
select public.respond_adjustment(:'req', 'Domingo');
\echo '-- aceita no lugar do cliente (deve FALHAR):'
select public.decide_adjustment(:'req', true);

\echo '== Guilherme aceita =='
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000001';
\echo '-- cancela depois de proposto (deve FALHAR):'
select public.cancel_adjustment(:'req');
\echo '-- aceita (OK) e fica aceito:'
select public.decide_adjustment(:'req', true);
select status, proposal from adjustment_requests where id = :'req';
\echo '-- decide de novo (deve FALHAR):'
select public.decide_adjustment(:'req', false);
\echo '-- novo pedido e cancela (OK, esperado cancelado):'
insert into adjustment_requests (person_id, professional_id, kind, message)
values (auth.uid(), 'fb000000-0000-4000-8000-000000000002', 'aliviar', 'Semana puxada.');
select public.cancel_adjustment(id) from adjustment_requests where person_id = auth.uid() and status = 'aberto';
select status from adjustment_requests where person_id = auth.uid() and kind = 'aliviar';

\echo '== compartilhamento encerrado =='
reset role;
update shares set revoked_at = now() where person_id = 'fb000000-0000-4000-8000-000000000001';
set role authenticated;
set request.jwt.claim.sub = 'fb000000-0000-4000-8000-000000000002';
\echo '-- profissional nao ve mais os pedidos (esperado 0):'
select count(*) from adjustment_requests;

\echo '== Lucas (demo) pede a profissional real (deve FALHAR) =='
reset role;
insert into shares (person_id, professional_id) values ('d0000000-0000-4000-8000-000000000001', 'fb000000-0000-4000-8000-000000000003');
set role authenticated;
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
insert into adjustment_requests (person_id, professional_id, kind, message)
values (auth.uid(), 'fb000000-0000-4000-8000-000000000003', 'outro', 'Oi');
\echo '== anonimo (deve FALHAR) =='
reset role; set role anon;
select public.cancel_adjustment(:'req');
reset role;
