-- =============================================================================
-- Skyro · posts demonstrativos na Comunidade
--
-- Cria posts, comentários e curtidas FICTÍCIOS entre as contas demo (Lucas,
-- Ana, Pedro, Carlos, Fernanda e pacientes da Ana). Só contas demo veem.
--
-- Pré-requisito: migration 20261127000001_comunidade.sql.
-- Como rodar: SQL Editor → colar → Run, DEPOIS dos seeds 01, 02 e 03.
-- Pode rodar quantas vezes quiser (as datas acompanham a hora de agora).
-- =============================================================================

do $$
declare
  v_lucas    constant uuid := 'd0000000-0000-4000-8000-000000000001';
  v_ana      constant uuid := 'd0000000-0000-4000-8000-000000000002';
  v_carlos   constant uuid := 'c0000000-0000-4000-8000-000000000001';
  v_pedro    constant uuid := 'c0000000-0000-4000-8000-000000000003';
  v_fernanda constant uuid := 'c0000000-0000-4000-8000-000000000008';
  v_beatriz  constant uuid := 'e0000000-0000-4000-8000-000000000001';
  v_rafael   constant uuid := 'e0000000-0000-4000-8000-000000000002';
  v_camila   constant uuid := 'e0000000-0000-4000-8000-000000000003';
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid; v_p5 uuid; v_p6 uuid;
begin
  if not exists (select 1 from public.professionals where id = v_ana) then
    raise exception 'Rode primeiro os seeds 01, 02 e 03.';
  end if;

  delete from public.community_posts
  where author_id in (select id from public.profiles where is_demo);

  insert into public.community_posts (author_id, topic, body, created_at) values
    (v_ana, 'nutricao', 'Lanche prático para quem tem plantão: iogurte natural, uma fruta e um punhado de castanhas. Cabe na bolsa e segura até o jantar.', now() - interval '3 hours')
    returning id into v_p1;
  insert into public.community_posts (author_id, topic, body, created_at) values
    (v_lucas, 'geral', 'Primeira semana registrando o sono todo dia. Não imaginava que dormia tão pouco no domingo. Alguém mais percebeu isso?', now() - interval '6 hours')
    returning id into v_p2;
  insert into public.community_posts (author_id, topic, body, created_at) values
    (v_pedro, 'treino', 'Treino perdido não se compensa dobrando o próximo. Volte para a rotina normal e mantenha a constância: é ela que dá resultado.', now() - interval '1 day')
    returning id into v_p3;
  insert into public.community_posts (author_id, topic, body, created_at) values
    (v_carlos, 'mente', 'Dois minutos de respiração antes de dormir (inspira em 4, segura 4, solta em 6) ajudam a desacelerar depois de um dia puxado.', now() - interval '1 day 4 hours')
    returning id into v_p4;
  insert into public.community_posts (author_id, topic, body, created_at) values
    (v_beatriz, 'nutricao', 'Meta da semana: levar a garrafinha para o trabalho todo dia. Hoje já foi 1,5 L!', now() - interval '2 days')
    returning id into v_p5;
  insert into public.community_posts (author_id, topic, body, created_at) values
    (v_fernanda, 'fisio', 'Quem trabalha sentado: a cada hora, levante, alongue o pescoço e os ombros por 30 segundos. Sua lombar agradece.', now() - interval '3 days')
    returning id into v_p6;

  insert into public.community_comments (post_id, author_id, body, created_at) values
    (v_p1, v_lucas,  'Vou testar no plantão de quinta!', now() - interval '2 hours'),
    (v_p1, v_camila, 'Troquei as castanhas por amendoim e funcionou bem também.', now() - interval '1 hour'),
    (v_p2, v_ana,    'Muito comum, Lucas. Tenta manter o mesmo horário de acordar no fim de semana.', now() - interval '5 hours'),
    (v_p2, v_rafael, 'Comigo é igual, domingo é o pior dia.', now() - interval '4 hours'),
    (v_p3, v_lucas,  'Precisava ler isso hoje.', now() - interval '20 hours'),
    (v_p5, v_ana,    'Isso aí, Beatriz! 💧', now() - interval '1 day 20 hours');

  insert into public.community_likes (post_id, user_id) values
    (v_p1, v_lucas), (v_p1, v_beatriz), (v_p1, v_camila), (v_p1, v_pedro),
    (v_p2, v_ana), (v_p2, v_rafael),
    (v_p3, v_lucas), (v_p3, v_ana), (v_p3, v_camila),
    (v_p4, v_lucas), (v_p4, v_beatriz),
    (v_p5, v_ana), (v_p5, v_lucas),
    (v_p6, v_pedro);
end $$;
