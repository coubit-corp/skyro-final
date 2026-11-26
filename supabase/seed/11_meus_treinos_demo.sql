-- Meus treinos da pessoa demo: dois treinos montados e dois registrados no app.
-- Pode rodar mais de uma vez.
delete from public.workout_routines where person_id = 'd0000000-0000-4000-8000-000000000001';
insert into public.workout_routines (id, person_id, name, exercises, created_at) values
  ('d7000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Dia 1 · Peito e tríceps',
   '[{"name":"Supino inclinado (máquina)","muscle":"peito","sets":4,"reps":"8-10","rest_sec":135},
     {"name":"Crucifixo (máquina)","muscle":"peito","sets":3,"reps":"10-12","rest_sec":120},
     {"name":"Tríceps na polia com corda","muscle":"triceps","sets":3,"reps":"10-12","rest_sec":90}]'::jsonb,
   now() - interval '20 days'),
  ('d7000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Dia 2 · Costas e bíceps',
   '[{"name":"Puxada alta (cabo)","muscle":"costas","sets":4,"reps":"8-10","rest_sec":120},
     {"name":"Remada sentada (cabo)","muscle":"costas","sets":3,"reps":"10","rest_sec":120},
     {"name":"Rosca direta (barra)","muscle":"biceps","sets":3,"reps":"10-12","rest_sec":90}]'::jsonb,
   now() - interval '19 days');

delete from public.history_entries
 where person_id = 'd0000000-0000-4000-8000-000000000001' and source = 'skyro';
insert into public.history_entries (person_id, kind, occurred_on, title, details, source, source_key) values
  ('d0000000-0000-4000-8000-000000000001', 'treino', current_date - 9, 'Dia 1 · Peito e tríceps',
   '{"duration_min":47,"exercises":[{"name":"Supino inclinado (máquina)","muscle":"peito","sets":[{"reps":15,"weight_kg":15},{"reps":8,"weight_kg":25},{"reps":8,"weight_kg":30},{"reps":8,"weight_kg":35}]},{"name":"Crucifixo (máquina)","muscle":"peito","sets":[{"reps":12,"weight_kg":30},{"reps":10,"weight_kg":35},{"reps":10,"weight_kg":35}]},{"name":"Tríceps na polia com corda","muscle":"triceps","sets":[{"reps":12,"weight_kg":20},{"reps":10,"weight_kg":25}]}]}'::jsonb,
   'skyro', 'demo-skyro-1'),
  ('d0000000-0000-4000-8000-000000000001', 'treino', current_date - 2, 'Dia 1 · Peito e tríceps',
   '{"duration_min":51,"exercises":[{"name":"Supino inclinado (máquina)","muscle":"peito","sets":[{"reps":15,"weight_kg":15},{"reps":8,"weight_kg":25},{"reps":8,"weight_kg":30},{"reps":8,"weight_kg":40},{"reps":8,"weight_kg":40}]},{"name":"Crucifixo (máquina)","muscle":"peito","sets":[{"reps":12,"weight_kg":30},{"reps":10,"weight_kg":35},{"reps":9,"weight_kg":40}]},{"name":"Tríceps na polia com corda","muscle":"triceps","sets":[{"reps":12,"weight_kg":25},{"reps":10,"weight_kg":25}]}]}'::jsonb,
   'skyro', 'demo-skyro-2');
