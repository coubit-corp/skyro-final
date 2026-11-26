-- Teste do histórico (Minha Evolução). Rodar num banco novo com stub + todas as
-- migrations + os seeds. Linhas "deve FALHAR" precisam dar ERROR.
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('fd000000-0000-4000-8000-000000000001', '{"full_name":"Guilherme","role":"person"}'),
  ('fd000000-0000-4000-8000-000000000002', '{"full_name":"Marcelo","role":"person"}'),
  ('fd000000-0000-4000-8000-000000000003', '{"full_name":"Personal","role":"professional"}');
insert into professionals (id, specialty, modality) values ('fd000000-0000-4000-8000-000000000003', 'personal', 'online');
insert into shares (person_id, professional_id) values ('fd000000-0000-4000-8000-000000000001', 'fd000000-0000-4000-8000-000000000003');
set role authenticated;

\echo '== Guilherme =='
set request.jwt.claim.sub = 'fd000000-0000-4000-8000-000000000001';
\echo '-- importa um treino (OK):'
insert into history_entries (kind, occurred_on, title, source, source_key) values ('treino', current_date - 30, 'Treino A', 'hevy', 'k1');
\echo '-- mesmo treino de novo (deve FALHAR: duplicata):'
insert into history_entries (kind, occurred_on, title, source, source_key) values ('treino', current_date - 30, 'Treino A', 'hevy', 'k1');
\echo '-- mesmo arquivo com on conflict do nothing (OK, esperado INSERT 0 1: so o k2 entra):'
insert into history_entries (kind, occurred_on, title, source, source_key) values
  ('treino', current_date - 30, 'Treino A', 'hevy', 'k1'), ('treino', current_date - 28, 'Treino B', 'hevy', 'k2')
on conflict (person_id, source, source_key) do nothing;
\echo '-- marco manual (OK):'
insert into history_entries (kind, occurred_on, title, source) values ('marco', current_date - 90, 'Primeiro desafio', 'manual');
\echo '-- data no futuro (deve FALHAR):'
insert into history_entries (kind, occurred_on, title, source) values ('marco', current_date + 3, 'Futuro', 'manual');
\echo '-- em nome de outra pessoa (deve FALHAR):'
insert into history_entries (person_id, kind, occurred_on, title, source) values ('fd000000-0000-4000-8000-000000000002', 'marco', current_date, 'x', 'manual');
\echo '-- editar direto (deve FALHAR):'
update history_entries set title = 'outro' where source_key = 'k1';
\echo '-- ve o proprio historico (esperado 3):'
select count(*) from history_entries;

\echo '== Marcelo =='
set request.jwt.claim.sub = 'fd000000-0000-4000-8000-000000000002';
\echo '-- nao ve o historico do Guilherme (esperado 0):'
select count(*) from history_entries;
\echo '-- nao apaga o historico do Guilherme (esperado DELETE 0):'
delete from history_entries where source_key = 'k1';
\echo '-- mesma chave em outra conta nao conflita (OK):'
insert into history_entries (kind, occurred_on, title, source, source_key) values ('treino', current_date - 30, 'Treino A', 'hevy', 'k1');

\echo '== Personal (acompanha o Guilherme) =='
set request.jwt.claim.sub = 'fd000000-0000-4000-8000-000000000003';
\echo '-- profissional nao le o historico (esperado 0):'
select count(*) from history_entries;

\echo '== Guilherme apaga =='
set request.jwt.claim.sub = 'fd000000-0000-4000-8000-000000000001';
\echo '-- apaga o proprio (esperado DELETE 1):'
delete from history_entries where source_key = 'k2';

\echo '== Demo =='
set request.jwt.claim.sub = 'd0000000-0000-4000-8000-000000000001';
\echo '-- pessoa demo ve o seed (esperado 4):'
select count(*) from history_entries;
\echo '-- conta demo e publica: nao grava (deve FALHAR):'
insert into history_entries (kind, occurred_on, title, source) values ('marco', current_date, 'meu marco', 'manual');
\echo '-- conta demo nao apaga o exemplo (esperado DELETE 0):'
delete from history_entries;

\echo '== Anonimo =='
reset request.jwt.claim.sub;
set role anon;
\echo '-- anonimo nao le (deve FALHAR):'
select count(*) from history_entries;
reset role;
