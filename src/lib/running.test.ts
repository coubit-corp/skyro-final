import { describe, expect, it } from 'vitest'
import {
  buildRunPlan,
  isRunDetails,
  manualRun,
  paceLabel,
  parseGpx,
  parseRunFile,
  parseTcx,
  planProgress,
  runSummary,
} from './running'

// Quatro pontos em linha reta, ~0,5 km entre eles (0,0045° de latitude), 10 min no total.
const GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="StravaGPX" xmlns="http://www.topografix.com/GPX/1/1">
 <metadata><time>2026-11-26T09:00:00Z</time></metadata>
 <trk>
  <name>Corrida &amp; parque</name>
  <type>running</type>
  <trkseg>
   <trkpt lat="-23.5500" lon="-46.6300"><ele>760</ele><time>2026-11-26T09:00:00Z</time></trkpt>
   <trkpt lat="-23.5545" lon="-46.6300"><ele>765</ele><time>2026-11-26T09:03:20Z</time></trkpt>
   <trkpt lat="-23.5590" lon="-46.6300"><ele>764</ele><time>2026-11-26T09:06:40Z</time></trkpt>
   <trkpt lat="-23.5635" lon="-46.6300"><ele>770</ele><time>2026-11-26T09:10:00Z</time></trkpt>
  </trkseg>
 </trk>
</gpx>`

const TCX = `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
 <Activities>
  <Activity Sport="Running">
   <Id>2026-11-25T21:30:00Z</Id>
   <Lap StartTime="2026-11-25T21:30:00Z">
    <Track>
     <Trackpoint><Time>2026-11-25T21:30:00Z</Time><DistanceMeters>0</DistanceMeters><AltitudeMeters>10</AltitudeMeters></Trackpoint>
     <Trackpoint><Time>2026-11-25T21:45:00Z</Time><DistanceMeters>2500</DistanceMeters><AltitudeMeters>14</AltitudeMeters></Trackpoint>
     <Trackpoint><Time>2026-11-25T22:00:00Z</Time><DistanceMeters>5000</DistanceMeters><AltitudeMeters>11</AltitudeMeters></Trackpoint>
    </Track>
   </Lap>
  </Activity>
 </Activities>
</TrainingCenterDatabase>`

describe('parseGpx', () => {
  it('lê distância, duração, subida, nome e data (horário de Brasília)', () => {
    const r = parseGpx(GPX)!
    expect(r.title).toBe('Corrida & parque')
    expect(r.occurred_on).toBe('2026-11-26')
    expect(r.source_key).toBe('2026-11-26T09:00:00.000Z')
    expect(r.details.sport).toBe('corrida')
    expect(r.details.origin).toBe('gpx')
    expect(r.details.distance_km).toBeCloseTo(1.5, 1)
    expect(r.details.duration_min).toBe(10)
    expect(r.details.elevation_m).toBe(11) // 760 → 765 (+5) e 764 → 770 (+6); a queda de 1 m não conta
  })
  it('arquivo que não é GPX ou sem horários: null', () => {
    expect(parseGpx('<html></html>')).toBeNull()
    expect(parseGpx(GPX.replace(/<time>[^<]+<\/time>/g, ''))).toBeNull()
  })
  it('reconhece pedal e caminhada pelo tipo', () => {
    expect(parseGpx(GPX.replace('running', 'cycling'))!.details.sport).toBe('pedal')
    expect(parseGpx(GPX.replace('running', 'walking'))!.details.sport).toBe('caminhada')
  })
})

describe('parseTcx', () => {
  it('usa a distância do arquivo e a data em Brasília (21h30 UTC = 18h30 do mesmo dia)', () => {
    const r = parseTcx(TCX)!
    expect(r.details).toEqual({ sport: 'corrida', origin: 'tcx', distance_km: 5, duration_min: 30, elevation_m: 4 })
    expect(r.occurred_on).toBe('2026-11-25')
    expect(r.title).toBe('Corrida')
  })
})

describe('parseRunFile', () => {
  it('tenta GPX e TCX e recusa data no futuro', () => {
    expect(parseRunFile(GPX, '2026-11-27')?.details.origin).toBe('gpx')
    expect(parseRunFile(TCX, '2026-11-27')?.details.origin).toBe('tcx')
    expect(parseRunFile(GPX, '2026-11-20')).toBeNull()
    expect(parseRunFile('qualquer coisa', '2026-11-27')).toBeNull()
  })
})

describe('manualRun', () => {
  it('aceita vírgula e mm:ss', () => {
    const r = manualRun({ date: '2026-11-27', distance: '5,2', duration: '31:30', sport: 'corrida' }, '2026-11-27')
    expect(typeof r).not.toBe('string')
    if (typeof r !== 'string') expect(r.details).toEqual({ sport: 'corrida', origin: 'manual', distance_km: 5.2, duration_min: 31.5 })
  })
  it('recusa valores inválidos e data no futuro', () => {
    expect(manualRun({ date: '2026-11-27', distance: '0', duration: '30', sport: 'corrida' }, '2026-11-27')).toMatch(/distância/)
    expect(manualRun({ date: '2026-11-27', distance: '5', duration: 'abc', sport: 'corrida' }, '2026-11-27')).toMatch(/duração/)
    expect(manualRun({ date: '2026-11-28', distance: '5', duration: '30', sport: 'corrida' }, '2026-11-27')).toMatch(/futuro/)
  })
})

describe('ritmo e resumo', () => {
  it('paceLabel em min/km', () => {
    expect(paceLabel({ distance_km: 5, duration_min: 30 })).toBe('6:00 /km')
    expect(paceLabel({ distance_km: 5.2, duration_min: 31.5 })).toBe('6:03 /km')
  })
  it('runSummary e isRunDetails', () => {
    expect(runSummary({ sport: 'corrida', origin: 'gpx', distance_km: 5.2, duration_min: 31.5, elevation_m: 42 })).toBe(
      '5,2 km · 32 min · 6:03 /km · 42 m de subida',
    )
    expect(runSummary({ sport: 'pedal', origin: 'gpx', distance_km: 20, duration_min: 60 })).toBe('20 km · 60 min')
    expect(isRunDetails({ sport: 'corrida', distance_km: 1, duration_min: 5 })).toBe(true)
    expect(isRunDetails({ exercises: [] })).toBe(false)
    expect(isRunDetails(null)).toBe(false)
  })
})

describe('buildRunPlan', () => {
  it('5 km, 3 dias: 8 semanas em terça/quinta/sábado, sem sessão antes do início, termina na prova', () => {
    const s = buildRunPlan({ goal: '5k', days_per_week: 3, level: 'iniciante', starts_on: '2026-11-25' }) // quarta
    expect(s).toHaveLength(8 * 3 - 1) // a terça 24/11 já passou
    expect(s[0].date).toBe('2026-11-26') // quinta
    expect(s.at(-1)!.kind).toBe('prova')
    expect(s.at(-1)!.title).toBe('Prova ou teste: 5 km')
  })

  it('o longo cresce, tem semana de recuperação e diminui antes da prova', () => {
    const s = buildRunPlan({ goal: '10k', days_per_week: 3, level: 'intermediario', starts_on: '2026-11-23' })
    const longs = s.filter((x) => x.kind === 'longo').map((x) => x.minutes)
    expect(longs[0]).toBe(35)
    expect(longs[3]).toBeLessThan(longs[2]) // semana 4: recuperação
    expect(Math.max(...longs)).toBe(70)
    expect(longs.at(-1)!).toBeLessThan(70) // semana antes da prova
  })

  it('iniciante começa com corrida e caminhada; intermediário tem tiros e ritmo', () => {
    const ini = buildRunPlan({ goal: '5k', days_per_week: 3, level: 'iniciante', starts_on: '2026-11-23' })
    expect(ini[0].description).toMatch(/caminhando/)
    const inter = buildRunPlan({ goal: '5k', days_per_week: 3, level: 'intermediario', starts_on: '2026-11-23' })
    expect(inter.some((x) => x.kind === 'qualidade')).toBe(true)
  })

  it('dias da semana espaçados conforme a quantidade', () => {
    const two = buildRunPlan({ goal: '5k', days_per_week: 2, level: 'intermediario', starts_on: '2026-11-23' })
    expect(two.slice(0, 2).map((x) => x.date)).toEqual(['2026-11-24', '2026-11-28']) // terça e sábado
    const four = buildRunPlan({ goal: '5k', days_per_week: 4, level: 'intermediario', starts_on: '2026-11-23' })
    expect(four.slice(0, 4).map((x) => x.date)).toEqual(['2026-11-23', '2026-11-25', '2026-11-27', '2026-11-29'])
  })

  it('meia maratona para iniciante ganha duas semanas a mais', () => {
    expect(buildRunPlan({ goal: '21k', days_per_week: 3, level: 'iniciante', starts_on: '2026-11-23' })).toHaveLength(14 * 3)
  })
})

describe('planProgress', () => {
  const s = buildRunPlan({ goal: '5k', days_per_week: 2, level: 'intermediario', starts_on: '2026-11-23' }) // terça 24 e sábado 28

  it('corrida em outro dia da mesma semana conta para a sessão da semana', () => {
    const p = planProgress(s, new Set(['2026-11-25']), '2026-11-27') // correu na quarta
    expect(p).toMatchObject({ done: 1, due: 1, total: 16, week: 1 })
    expect(p.doneDates.has('2026-11-24')).toBe(true)
    expect(p.next?.date).toBe('2026-11-28')
  })

  it('corridas a mais na semana não passam para a semana seguinte; futuras e antes do início não contam', () => {
    const p = planProgress(s, new Set(['2026-11-24', '2026-11-25', '2026-11-26', '2026-11-20', '2026-12-01']), '2026-11-28')
    expect(p.done).toBe(2)
    expect(p.doneDates.has('2026-12-01')).toBe(false)
  })

  it('a próxima sessão pula a de hoje se já foi feita', () => {
    const p = planProgress(s, new Set(['2026-11-24', '2026-11-28']), '2026-11-28')
    expect(p.today?.date).toBe('2026-11-28')
    expect(p.next?.date).toBe('2026-12-01')
  })
})
