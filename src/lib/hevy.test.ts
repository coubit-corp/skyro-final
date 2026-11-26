import { describe, expect, it } from 'vitest'
import { parseCsv, parseHevyCsv, parseHevyTime } from './hevy'

const CSV = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Treino A, superiores","28 Mar 2024, 18:30","28 Mar 2024, 19:25","","Bench Press (Barbell)",,"",0,"normal",40,10,,,
"Treino A, superiores","28 Mar 2024, 18:30","28 Mar 2024, 19:25","","Bench Press (Barbell)",,"",1,"normal",45,8,,,
"Treino A, superiores","28 Mar 2024, 18:30","28 Mar 2024, 19:25","","Bent Over Row",,"nota com ""aspas""",0,"normal",35,10,,,
"Treino B","30 Mar 2024, 07:00","30 Mar 2024, 07:50","","Squat (Barbell)",,"",0,"normal",60,5,,,
"Sem data","","","","Squat (Barbell)",,"",0,"normal",60,5,,,
"Futuro","28 Mar 2031, 07:00","28 Mar 2031, 07:50","","Squat (Barbell)",,"",0,"normal",60,5,,,
`

describe('CSV', () => {
  it('respeita aspas, vírgulas e aspas duplas dentro do campo', () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,2,3\n')).toEqual([
      ['a', 'b, c', 'd "e"'],
      ['1', '2', '3'],
    ])
  })
})

describe('data do Hevy', () => {
  it('lê o formato do app e o ISO', () => {
    expect(parseHevyTime('28 Mar 2024, 18:30')).toEqual({ date: '2024-03-28', minutes: 1110 })
    expect(parseHevyTime('2024-03-28 18:30:00')).toEqual({ date: '2024-03-28', minutes: 1110 })
  })
  it('recusa data que não existe ou texto solto', () => {
    expect(parseHevyTime('31 Feb 2024, 10:00')).toBeNull()
    expect(parseHevyTime('ontem')).toBeNull()
  })
})

describe('importação do Hevy', () => {
  const p = parseHevyCsv(CSV, '2026-11-26')!
  it('junta as séries em treinos, do mais recente para o mais antigo', () => {
    expect(p.workouts.map((w) => [w.occurred_on, w.title])).toEqual([
      ['2024-03-30', 'Treino B'],
      ['2024-03-28', 'Treino A, superiores'],
    ])
    const a = p.workouts[1]
    expect(a.details.duration_min).toBe(55)
    expect(a.details.exercises).toEqual([
      { name: 'Bench Press (Barbell)', sets: [{ reps: 10, weight_kg: 40 }, { reps: 8, weight_kg: 45 }] },
      { name: 'Bent Over Row', sets: [{ reps: 10, weight_kg: 35 }] },
    ])
  })
  it('mostra o período, os exercícios e as linhas deixadas de fora', () => {
    expect([p.from, p.to]).toEqual(['2024-03-28', '2024-03-30'])
    expect(p.exercises.map((e) => e.name)).toEqual(['Bench Press (Barbell)', 'Bent Over Row', 'Squat (Barbell)'])
    expect(p.skippedRows).toBe(2)
  })
  it('o mesmo arquivo gera sempre as mesmas chaves', () => {
    const again = parseHevyCsv(CSV, '2026-11-26')!
    expect(again.workouts.map((w) => w.source_key)).toEqual(p.workouts.map((w) => w.source_key))
    expect(new Set(p.workouts.map((w) => w.source_key)).size).toBe(2)
  })
  it('converte libras para quilos', () => {
    const lbs = parseHevyCsv('title,start_time,exercise_title,weight_lbs,reps\nA,"1 Jan 2024, 10:00",Squat,100,5\n', '2026-01-01')!
    expect(lbs.workouts[0].details.exercises[0].sets[0]).toEqual({ reps: 5, weight_kg: 45.4 })
  })
  it('recusa arquivo que não é do Hevy', () => {
    expect(parseHevyCsv('data,descricao\n2024-01-01,algo\n', '2026-01-01')).toBeNull()
    expect(parseHevyCsv('', '2026-01-01')).toBeNull()
  })
})
