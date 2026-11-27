-- Teste da equipe do paciente. Rodar num banco novo com stub + todas as
-- migrations + os seeds. Linhas "deve FALHAR" precisam dar ERROR.
\set ON_ERROR_STOP 0
insert into auth.users (id, raw_user_meta_data) values
  ('fd000000-0000-4000-8000-000000000001', '{"full_name":"Paciente Um","role":"person"}'),
  ('fd000000-0000-4000-8000-000000000002', '{"full_name":"Paciente Dois","role":"person"}'),
  ('fd000000-0000-4000-8000-000000000003', '{"full_name":"Paula Personal","role":"professional"}'),
  ('fd000000-0000-4000-8000-000000000004', '{"full_name":"Nina Nutri Souza","role":"professional"}'),
  ('fd000000-0000-4000-8000-000000000005', '{"full_name":"Fabio Fisio","role":"professional"}');
insert into professionals (id, specialty, modality) values
  ('fd000000-0000-4000-8000-000000000003', 'personal', 'online'),
  ('fd000000-0000-4000-8000-000000000004', 'nutricionista', 'online'),
  ('fd000000-0000-4000-8000-000000000005', 'fisioterapeuta', 'online');
-- Paciente Um: Paula, Nina e Fabio (Fabio revogado). Paciente Dois: só Nina.
insert into shares (person_id, professional_id, revoked_at) values
  ('fd000000-0000-4000-8000-000000000001', 'fd000000-0000-4000-8000-000000000003', null),
  ('fd000000-0000-4000-8000-000000000001', 'fd000000-0000-4000-8000-000000000004', null),
  ('fd000000-0000-4000-8000-000000000001', 'fd000000-0000-4000-8000-000000000005', now()),
  ('fd000000-0000-4000-8000-000000000002', 'fd000000-0000-4000-8000-000000000004', null);
set role authenticated;

\echo '== Paula (personal) =='
set request.jwt.claim.sub = 'fd000000-0000-4000-8000-000000000003';
\echo '-- ve so a Nina no Paciente Um (esperado 1 linha: Nina, nutricionista; Fabio revogado fica de fora):'
select specialty, first_name from patient_teams() where person_id = 'fd000000-0000-4000-8000-000000000001';
\echo '-- nao ve nada do Paciente Dois, que nao compartilha com ela (esperado 0):'
select count(*) from patient_teams() where person_id = 'fd000000-0000-4000-8000-000000000002';
\echo '-- nao ve compartilhamentos dos outros pela tabela (esperado 1, so o dela):'
select count(*) from shares where person_id = 'fd000000-0000-4000-8000-000000000001';

\echo '== Nina (nutricionista) =='
set request.jwt.claim.sub = 'fd000000-0000-4000-8000-000000000004';
\echo '-- Paciente Um: Paula; Paciente Dois: ninguem (esperado 1 linha, Paula):'
select first_name from patient_teams();

\echo '== Fabio (revogado) =='
set request.jwt.claim.sub = 'fd000000-0000-4000-8000-000000000005';
\echo '-- compartilhamento revogado nao ve a equipe (esperado 0):'
select count(*) from patient_teams();

\echo '== Paciente Um (pessoa) =='
set request.jwt.claim.sub = 'fd000000-0000-4000-8000-000000000001';
\echo '-- pessoa recebe lista vazia (esperado 0):'
select count(*) from patient_teams();

\echo '== anon =='
reset request.jwt.claim.sub;
set role anon;
\echo '-- anon nao executa (deve FALHAR):'
select * from patient_teams();
reset role;
