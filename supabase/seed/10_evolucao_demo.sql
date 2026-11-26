-- Minha Evolução da pessoa demo: um marco e três treinos "importados do Hevy".
-- Pode rodar mais de uma vez.
insert into public.history_entries (person_id, kind, occurred_on, title, details, source, source_key)
values
  ('d0000000-0000-4000-8000-000000000001', 'marco', current_date - 120,
   'Concluí meu primeiro desafio de 12 treinos', '{}'::jsonb, 'manual', 'demo-marco-1'),
  ('d0000000-0000-4000-8000-000000000001', 'treino', current_date - 45, 'Treino A · Superiores',
   '{"duration_min":52,"exercises":[{"name":"Supino reto","sets":[{"reps":10,"weight_kg":40},{"reps":8,"weight_kg":45}]},{"name":"Remada curvada","sets":[{"reps":10,"weight_kg":35},{"reps":10,"weight_kg":35}]}]}'::jsonb,
   'hevy', 'demo-hevy-1'),
  ('d0000000-0000-4000-8000-000000000001', 'treino', current_date - 43, 'Treino B · Inferiores',
   '{"duration_min":48,"exercises":[{"name":"Agachamento","sets":[{"reps":10,"weight_kg":50},{"reps":10,"weight_kg":55}]},{"name":"Leg press","sets":[{"reps":12,"weight_kg":120}]}]}'::jsonb,
   'hevy', 'demo-hevy-2'),
  ('d0000000-0000-4000-8000-000000000001', 'treino', current_date - 20, 'Treino A · Superiores',
   '{"duration_min":55,"exercises":[{"name":"Supino reto","sets":[{"reps":10,"weight_kg":45},{"reps":8,"weight_kg":50}]},{"name":"Remada curvada","sets":[{"reps":10,"weight_kg":40}]}]}'::jsonb,
   'hevy', 'demo-hevy-3')
on conflict (person_id, source, source_key) do update
  set occurred_on = excluded.occurred_on, title = excluded.title, details = excluded.details;
