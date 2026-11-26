-- =============================================================================
-- Skyro · pedidos de ajuste demonstrativos
--
-- Cria pedidos FICTÍCIOS: Lucas pediu ao Pedro (personal) para trocar o dia do
-- treino e o Pedro já propôs sábado; Lucas, Beatriz e Rafael têm pedidos com a
-- Ana (nutricionista), um deles já combinado.
--
-- Pré-requisito: migration 20261127000003_pedidos_ajuste.sql.
-- Como rodar: SQL Editor → colar → Run, DEPOIS dos seeds 01, 02 e 03.
-- Pode rodar quantas vezes quiser.
-- =============================================================================

do $$
declare
  v_lucas    constant uuid := 'd0000000-0000-4000-8000-000000000001';
  v_ana      constant uuid := 'd0000000-0000-4000-8000-000000000002';
  v_pedro    constant uuid := 'c0000000-0000-4000-8000-000000000003';
  v_beatriz  constant uuid := 'e0000000-0000-4000-8000-000000000001';
  v_rafael   constant uuid := 'e0000000-0000-4000-8000-000000000002';
begin
  if not exists (select 1 from public.professionals where id = v_ana) then
    raise exception 'Rode primeiro os seeds 01, 02 e 03.';
  end if;

  delete from public.adjustment_requests where professional_id in (v_ana, v_pedro);

  insert into public.adjustment_requests
    (person_id, professional_id, kind, message, status, proposal, created_at, responded_at, decided_at) values
    (v_beatriz, v_ana, 'substituir', 'Não estou conseguindo fazer o lanche da tarde no trabalho. Dá para trocar por algo que não precise de geladeira?',
       'aberto', null, now() - interval '5 hours', null, null),
    (v_rafael, v_ana, 'aliviar', 'Semana de provas: posso simplificar o jantar nos próximos dias?',
       'aberto', null, now() - interval '1 day', null, null),
    (v_lucas, v_ana, 'substituir', 'Nos dias de plantão não consigo almoçar no horário. Posso levar marmita?',
       'aceito', 'Pode. Nos dias de plantão, troque o almoço por marmita com proteína e legumes, e mantenha o lanche das 16h.',
       now() - interval '6 days', now() - interval '5 days 20 hours', now() - interval '5 days 18 hours');

  if exists (select 1 from public.professionals where id = v_pedro)
     and exists (select 1 from public.shares where person_id = v_lucas and professional_id = v_pedro and revoked_at is null) then
    insert into public.adjustment_requests
      (person_id, professional_id, kind, message, status, proposal, created_at, responded_at) values
      (v_lucas, v_pedro, 'trocar_dia', 'Na quarta a aula termina tarde e não consigo treinar. Dá para mudar o dia?',
         'proposto', 'Vamos passar o treino de quarta para sábado de manhã, mesmo treino. Pode ser?',
         now() - interval '4 hours', now() - interval '1 hour');
  end if;
end $$;
