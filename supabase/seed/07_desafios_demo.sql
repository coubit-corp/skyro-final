-- =============================================================================
-- Skyro · clube e desafios demonstrativos
--
-- Cria o clube "Voltando a treinar" da demo, o desafio da semana passada (já
-- encerrado) e o desta semana, com Lucas, Beatriz, Rafael e Pedro. Só contas
-- demo veem.
--
-- Pré-requisito: migration 20261127000002_desafios.sql.
-- Como rodar: SQL Editor → colar → Run, DEPOIS dos seeds 01 a 06.
-- Pode rodar quantas vezes quiser (as datas acompanham o dia de hoje).
-- =============================================================================

do $$
declare
  v_club     constant uuid := 'c1000000-0000-4000-8000-0000000000d1';
  v_lucas    constant uuid := 'd0000000-0000-4000-8000-000000000001';
  v_pedro    constant uuid := 'c0000000-0000-4000-8000-000000000003';
  v_beatriz  constant uuid := 'e0000000-0000-4000-8000-000000000001';
  v_rafael   constant uuid := 'e0000000-0000-4000-8000-000000000002';
  v_today    constant date := public.today_brt();
  v_monday   constant date := v_today - (extract(isodow from v_today)::int - 1);
  v_last     uuid;
  v_now      uuid;
begin
  if not exists (select 1 from public.profiles where id = v_lucas) then
    raise exception 'Rode primeiro os seeds 01 a 06.';
  end if;

  insert into public.community_clubs (id, name, description, is_demo)
  values (v_club, 'Voltando a treinar',
          'Para quem está retomando a rotina de treinos. Desafios semanais com meta pessoal: o descanso faz parte do plano.', true)
  on conflict (id) do update set name = excluded.name, description = excluded.description, is_demo = true;

  delete from public.challenges where club_id = v_club;
  delete from public.community_club_members where club_id = v_club;

  insert into public.community_club_members (club_id, user_id) values
    (v_club, v_lucas), (v_club, v_pedro), (v_club, v_beatriz), (v_club, v_rafael);

  -- Semana passada: Lucas cumpriu 2 de 2, Beatriz 3 de 3, Rafael 1 de 3.
  insert into public.challenges (club_id, created_by, title, starts_on, ends_on, created_at)
  values (v_club, v_lucas, 'Treinar na semana', v_monday - 7, v_monday - 1, now() - interval '8 days')
  returning id into v_last;
  insert into public.challenge_participants (challenge_id, user_id, weekly_goal) values
    (v_last, v_lucas, 2), (v_last, v_beatriz, 3), (v_last, v_rafael, 3);
  insert into public.challenge_checkins (challenge_id, user_id, activity_date) values
    (v_last, v_lucas, v_monday - 7), (v_last, v_lucas, v_monday - 3),
    (v_last, v_beatriz, v_monday - 7), (v_last, v_beatriz, v_monday - 5), (v_last, v_beatriz, v_monday - 2),
    (v_last, v_rafael, v_monday - 6);

  -- Esta semana: Lucas quer 3 treinos e já fez 1 (segunda); Beatriz quer 2.
  insert into public.challenges (club_id, created_by, title, starts_on, ends_on, created_at)
  values (v_club, v_lucas, 'Vou treinar três vezes nesta semana', v_monday, v_monday + 6, now() - interval '1 hour')
  returning id into v_now;
  insert into public.challenge_participants (challenge_id, user_id, weekly_goal) values
    (v_now, v_lucas, 3), (v_now, v_beatriz, 2), (v_now, v_pedro, 3);
  insert into public.challenge_checkins (challenge_id, user_id, activity_date) values
    (v_now, v_lucas, v_monday), (v_now, v_beatriz, v_monday);
  insert into public.challenge_cheers (challenge_id, from_user, to_user, cheer_date) values
    (v_now, v_beatriz, v_lucas, v_today), (v_now, v_pedro, v_lucas, v_today);

  insert into public.community_posts (author_id, topic, body, challenge_id, created_at)
  values (v_lucas, 'treino', 'Vou treinar três vezes nesta semana. Quem topa entrar comigo no desafio?', v_now, now() - interval '1 hour');
end $$;
