import { ExternalLink, Play, Search } from 'lucide-react'
import { useState } from 'react'
import { equipmentLabel, youtubeSearchUrl } from '../lib/exerciseGuide'
import { embedUrl, PROVIDER_LABEL, videoThumbnail, watchUrl, type VideoRef } from '../lib/vitrine'
import { MUSCLES, muscleLabel, type ExerciseInfo, type Muscle } from '../lib/workouts'

/**
 * Vídeo de como fazer. O player do YouTube só carrega quando a pessoa toca:
 * a lista abre rápido e nada é enviado ao YouTube antes disso.
 */
export function ExerciseVideo({ name, video }: { name: string; video: VideoRef | null }) {
  const [playing, setPlaying] = useState(false)

  if (!video) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-chip p-4 text-center text-sm">
        <p className="text-muted">Este exercício ainda não tem vídeo próprio.</p>
        <a href={youtubeSearchUrl(name)} target="_blank" rel="noopener noreferrer" className="btn-outline gap-2">
          <Search className="h-4 w-4" aria-hidden="true" /> Procurar vídeo no YouTube
        </a>
      </div>
    )
  }

  const thumb = videoThumbnail(video)
  return (
    <div className="space-y-1.5">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {playing ? (
          <iframe
            src={embedUrl(video)}
            title={`Como fazer: ${name}`}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-lavender"
            aria-label={`Assistir vídeo: como fazer ${name}`}
          >
            {thumb && (
              <img
                src={thumb}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-90"
                onError={(ev) => (ev.currentTarget.style.display = 'none')}
              />
            )}
            <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-lavender text-black shadow-lg transition group-hover:scale-110">
              <Play className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden="true" />
            </span>
            <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
              Como fazer
            </span>
          </button>
        )}
      </div>
      <a href={watchUrl(video)} target="_blank" rel="noopener noreferrer" className="tap gap-1 text-xs font-semibold text-muted hover:text-ink">
        Abrir no {PROVIDER_LABEL[video.provider]} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  )
}

/** Músculos (principal e secundários) e equipamento. */
export function ExerciseTags({ info }: { info: ExerciseInfo }) {
  return (
    <ul className="flex flex-wrap gap-1.5 text-xs font-semibold">
      <li className="rounded-full bg-lavender/20 px-2.5 py-1">Principal: {muscleLabel(info.muscle)}</li>
      {info.secondary.map((m) => (
        <li key={m} className="rounded-full bg-chip px-2.5 py-1 text-muted">
          {muscleLabel(m)}
        </li>
      ))}
      {info.equipment && <li className="rounded-full border border-line px-2.5 py-1 text-muted">{equipmentLabel(info.equipment)}</li>}
    </ul>
  )
}

/** Passo a passo numerado. */
export function ExerciseSteps({ info }: { info: ExerciseInfo }) {
  if (info.steps.length === 0) {
    return <p className="text-sm text-muted">Exercício criado por você: siga o vídeo ou a orientação do seu profissional.</p>
  }
  return (
    <div className="space-y-2">
      <ol className="space-y-3">
        {info.steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chip text-xs font-bold">{i + 1}</span>
            <span className="pt-0.5">{s}</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted">
        Orientação geral. Se sentir dor ou tiver alguma limitação, pare e fale com um profissional.
      </p>
    </div>
  )
}

/** Vídeo, músculos e passo a passo juntos (para abrir dentro de outra tela). */
export function ExerciseGuidePanel({ info }: { info: ExerciseInfo }) {
  return (
    <div className="space-y-4">
      <ExerciseVideo name={info.name} video={info.video} />
      <ExerciseTags info={info} />
      <ExerciseSteps info={info} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mapa do corpo
// ---------------------------------------------------------------------------

type Shape = { muscle?: Muscle; kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number } | { muscle?: Muscle; kind: 'rect'; x: number; y: number; w: number; h: number; r: number }

const e = (cx: number, cy: number, rx: number, ry: number, muscle?: Muscle): Shape => ({ kind: 'ellipse', cx, cy, rx, ry, muscle })
const r = (x: number, y: number, w: number, h: number, rr: number, muscle?: Muscle): Shape => ({ kind: 'rect', x, y, w, h, r: rr, muscle })
const pair = (cx: number, cy: number, rx: number, ry: number, muscle?: Muscle) => [e(cx, cy, rx, ry, muscle), e(120 - cx, cy, rx, ry, muscle)]

/** Base comum às duas vistas: cabeça, braços, tronco e pernas. */
const SILHOUETTE: Shape[] = [
  e(60, 20, 13, 15),
  r(54, 32, 12, 10, 3),
  r(38, 42, 44, 84, 14),
  ...pair(29, 80, 8, 22),
  ...pair(25, 112, 6, 17),
  ...pair(23, 134, 5, 6),
  ...pair(50, 160, 11, 34),
  ...pair(50, 208, 8, 24),
  ...pair(49, 238, 7, 5),
]

const FRONT: Shape[] = [
  ...pair(39, 50, 10, 9, 'ombros'),
  ...pair(50, 60, 11, 9, 'peito'),
  r(49, 72, 22, 44, 7, 'abdomen'),
  ...pair(30, 78, 6, 13, 'biceps'),
  ...pair(50, 154, 9, 26, 'quadriceps'),
]

const BACK: Shape[] = [
  r(46, 40, 28, 14, 6, 'costas'),
  ...pair(39, 50, 10, 9, 'ombros'),
  ...pair(49, 74, 10, 18, 'costas'),
  ...pair(30, 78, 6, 13, 'triceps'),
  ...pair(51, 124, 10, 9, 'gluteos'),
  ...pair(50, 158, 9, 22, 'posteriores'),
  ...pair(50, 204, 7, 15, 'panturrilhas'),
]

/** 0 (nada) a 1 (10 séries ou mais na semana). */
function intensity(sets: number | undefined): number {
  return sets ? Math.min(sets / 10, 1) : 0
}

function Figure({ shapes, sets, label }: { shapes: Shape[]; sets: Partial<Record<Muscle, number>>; label: string }) {
  const draw = (s: Shape, i: number, base: boolean) => {
    const level = s.muscle ? intensity(sets[s.muscle]) : 0
    const props = base
      ? { className: 'fill-chip stroke-line', strokeWidth: 1 }
      : level > 0
        ? { className: 'fill-lavender', fillOpacity: 0.3 + 0.7 * level }
        : { className: 'fill-line' }
    const title = s.muscle && !base ? <title>{`${muscleLabel(s.muscle)}: ${formatSets(sets[s.muscle] ?? 0)}`}</title> : null
    return s.kind === 'ellipse' ? (
      <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...props}>
        {title}
      </ellipse>
    ) : (
      <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r} {...props}>
        {title}
      </rect>
    )
  }
  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 120 250" className="h-56 w-auto" aria-hidden="true">
        {SILHOUETTE.map((s, i) => draw(s, i, true))}
        {shapes.map((s, i) => draw(s, i, false))}
      </svg>
      <figcaption className="text-xs font-semibold text-muted">{label}</figcaption>
    </figure>
  )
}

function formatSets(n: number): string {
  const v = Math.round(n * 2) / 2
  return `${String(v).replace('.', ',')} ${v === 1 ? 'série' : 'séries'}`
}

/** Quanto cada músculo trabalhou: figura de frente e de costas, mais a lista. */
export function BodyMap({ sets }: { sets: Partial<Record<Muscle, number>> }) {
  const ranked = MUSCLES.filter((m) => (sets[m.value] ?? 0) > 0).sort((a, b) => (sets[b.value] ?? 0) - (sets[a.value] ?? 0))
  const top = sets[ranked[0]?.value] ?? 1
  const summary = ranked.length
    ? `Músculos trabalhados: ${ranked.map((m) => `${m.label}, ${formatSets(sets[m.value] ?? 0)}`).join('; ')}`
    : 'Nenhum músculo trabalhado no período'
  return (
    <div className="space-y-4">
      <div role="img" aria-label={summary} className="flex justify-center gap-6">
        <Figure shapes={FRONT} sets={sets} label="Frente" />
        <Figure shapes={BACK} sets={sets} label="Costas" />
      </div>
      {ranked.length > 0 ? (
        <ul className="space-y-2 text-sm">
          {ranked.map((m) => (
            <li key={m.value} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3">
              <span className="truncate">{m.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-chip">
                <span className="block h-full rounded-full bg-lavender" style={{ width: `${((sets[m.value] ?? 0) / top) * 100}%` }} />
              </span>
              <span className="text-xs text-muted tabular-nums">{formatSets(sets[m.value] ?? 0)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center text-sm text-muted">Registre um treino para ver aqui os músculos que você trabalhou.</p>
      )}
    </div>
  )
}
