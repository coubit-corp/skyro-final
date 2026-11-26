-- =============================================================================
-- Skyro · registro do que a pessoa realmente comeu
--
-- Antes o plano só guardava "feito". Na nutrição isso não diz se a pessoa comeu
-- o planejado, trocou por outra coisa ou não conseguiu. Agora cada marcação tem:
--   outcome  feito | substituido | nao_consegui   (o padrão mantém o "feito" antigo)
--   note     texto opcional ("comi pão de queijo no lugar")
--
-- As regras de acesso de plan_checks continuam valendo: só a pessoa grava e o
-- profissional dono do item lê enquanto o compartilhamento estiver ativo.
--
-- Como rodar: painel do Supabase → SQL Editor → New query → colar → Run.
-- Pode rodar mais de uma vez.
-- =============================================================================

alter table public.plan_checks
  add column if not exists outcome text not null default 'feito',
  add column if not exists note text;

alter table public.plan_checks drop constraint if exists plan_checks_outcome_check;
alter table public.plan_checks
  add constraint plan_checks_outcome_check check (outcome in ('feito', 'substituido', 'nao_consegui'));

alter table public.plan_checks drop constraint if exists plan_checks_note_check;
alter table public.plan_checks
  add constraint plan_checks_note_check check (note is null or length(btrim(note)) between 1 and 200);
