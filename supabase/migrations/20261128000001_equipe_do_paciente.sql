-- =============================================================================
-- Skyro · Equipe do paciente na fila do profissional
--
--   patient_teams()   para cada paciente de quem chama: os OUTROS profissionais
--                     que acompanham a mesma pessoa (primeiro nome e área)
--
-- Por quê: na fila, o profissional precisa saber quem é o responsável por cada
-- alerta (ex.: pouca água é com a nutricionista). A tabela shares só deixa cada
-- profissional ver o próprio compartilhamento, então a função entrega o mínimo:
-- primeiro nome e área, nunca e-mail, telefone ou registros dos outros.
--
-- Garantias feitas pelo banco:
--   1. Só aparecem pessoas com quem QUEM CHAMA tem compartilhamento ativo.
--   2. Só aparecem colegas com compartilhamento ativo com a mesma pessoa.
--   3. Pessoa (não profissional) recebe lista vazia.
--
-- Rodar no Supabase: SQL Editor → colar → Run (depois de 20261127000006_meus_treinos.sql).
-- Pode rodar mais de uma vez.
-- =============================================================================

create or replace function public.patient_teams()
returns table (person_id uuid, professional_id uuid, specialty text, first_name text)
language sql
stable
security definer
set search_path = public
as $$
  select s.person_id,
         s.professional_id,
         pr.specialty::text,
         split_part(btrim(p.full_name), ' ', 1) as first_name
  from public.shares mine
  join public.shares s
    on s.person_id = mine.person_id
   and s.professional_id <> mine.professional_id
   and s.revoked_at is null
  join public.professionals pr on pr.id = s.professional_id
  join public.profiles p on p.id = s.professional_id
  where mine.professional_id = auth.uid()
    and mine.revoked_at is null
  order by s.person_id, pr.specialty::text;
$$;

revoke execute on function public.patient_teams() from public, anon;
grant execute on function public.patient_teams() to authenticated;
