-- Limpa os registros de teste da demo antes de gravar o vídeo.
-- Rodar no SQL Editor do Supabase. Mexe só nas contas demo do Lucas e da Ana:
--   - apaga as marcações do plano do Lucas com frase escrita em teste
--     (as duas frases do seed ficam);
--   - apaga as dicas da Ana para o Lucas enviadas em teste
--     (a dica do seed fica).
-- Pode rodar quantas vezes quiser. Rode primeiro só a parte 1 para conferir.

-- ---------------------------------------------------------------------------
-- 1. Conferir o que será apagado
-- ---------------------------------------------------------------------------
select 'marcação' as tipo, c.check_date as dia, i.title as item, c.outcome, c.note as texto
from public.plan_checks c
join public.plan_items i on i.id = c.item_id
join public.profiles p on p.id = c.person_id
where c.person_id = 'd0000000-0000-4000-8000-000000000001'
  and p.is_demo
  and c.note is not null
  and c.note not in ('Pão de queijo e café com leite na padaria', 'Reunião até tarde, acabei pulando')
union all
select 'dica', t.created_at::date, null, null, t.body
from public.tips t
join public.profiles p on p.id = t.person_id
where t.person_id = 'd0000000-0000-4000-8000-000000000001'
  and t.professional_id = 'd0000000-0000-4000-8000-000000000002'
  and p.is_demo
  and t.body <> 'Vi que você dormiu pouco esta semana. Ajustei o jantar para ficar mais leve e mais cedo: tente comer até as 20h e evitar café depois das 16h.'
order by 2 desc;

-- ---------------------------------------------------------------------------
-- 2. Apagar
-- ---------------------------------------------------------------------------
begin;

delete from public.plan_checks c
using public.profiles p
where p.id = c.person_id
  and c.person_id = 'd0000000-0000-4000-8000-000000000001'
  and p.is_demo
  and c.note is not null
  and c.note not in ('Pão de queijo e café com leite na padaria', 'Reunião até tarde, acabei pulando');

delete from public.tips t
using public.profiles p
where p.id = t.person_id
  and t.person_id = 'd0000000-0000-4000-8000-000000000001'
  and t.professional_id = 'd0000000-0000-4000-8000-000000000002'
  and p.is_demo
  and t.body <> 'Vi que você dormiu pouco esta semana. Ajustei o jantar para ficar mais leve e mais cedo: tente comer até as 20h e evitar café depois das 16h.';

commit;
