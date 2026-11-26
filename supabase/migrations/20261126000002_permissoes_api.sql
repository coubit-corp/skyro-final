-- =============================================================================
-- Skyro · permissões da API (anon / authenticated)
--
-- Projetos Supabase novos podem vir sem os GRANTs padrão nas tabelas do schema
-- public. Sem eles, o login funciona mas o app não lê nada ("permission denied
-- for table profiles") e fica em "Não conseguimos carregar sua conta".
--
-- Aqui: 1) dá as permissões padrão do Supabase (quem limita o acesso continua
-- sendo o RLS de cada tabela); 2) refaz as restrições por coluna das migrations
-- anteriores, na mesma ordem. Pode rodar mais de uma vez.
--
-- Como rodar: painel do Supabase → SQL Editor → New query → colar → Run.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

-- Restrições das migrations anteriores, reaplicadas.

-- 20261113000001_schema_inicial.sql
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_seed) on public.profiles to authenticated;
revoke update on public.professionals from authenticated;
grant update (bio, tags, neighborhood, lat, lng, modality) on public.professionals to authenticated;
revoke insert on public.professionals from authenticated;
grant insert (id, specialty, bio, registry, tags, city, neighborhood, lat, lng, modality) on public.professionals to authenticated;

-- 20261114000001_resumos_ia.sql
revoke update, delete on public.ai_summaries from authenticated;

-- 20261114000002_cadastro_profissional.sql
grant update (specialty, registry, city) on public.professionals to authenticated;

-- 20261115000001_aprovacao_registros.sql
revoke execute on function public.review_professional(uuid, text, text, text) from public, anon;
grant execute on function public.review_professional(uuid, text, text, text) to authenticated;
revoke insert, update, delete on public.registry_reviews from authenticated, anon;

-- 20261115000002_planos.sql
revoke update on public.plan_items from authenticated;
grant update (kind, title, weekdays, sets, reps, load, meal_time, foods, duration_min, notes, video_url, position) on public.plan_items to authenticated;
revoke update on public.plan_notes from authenticated;
grant update (note) on public.plan_notes to authenticated;

-- 20261116000001_perfil.sql
grant update (bio, avatar_path) on public.profiles to authenticated;
grant update (availability) on public.professionals to authenticated;
grant insert (availability) on public.professionals to authenticated;

-- 20261118000001_vitrine_profissional.sql
grant update (education, years_experience, birth_year, experiences, social_links) on public.professionals to authenticated;
grant insert (education, years_experience, birth_year, experiences, social_links) on public.professionals to authenticated;
revoke update on public.professional_media from authenticated;
grant update (caption) on public.professional_media to authenticated;
revoke insert, update on public.professional_reviews from authenticated;
grant insert (professional_id, person_id, rating, comment) on public.professional_reviews to authenticated;
grant update (rating, comment) on public.professional_reviews to authenticated;

-- 20261118000002_mensagens.sql
revoke insert, update, delete on public.messages from authenticated, anon;
grant insert (person_id, professional_id, sender_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
