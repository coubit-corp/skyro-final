import { Dumbbell, Footprints, Upload } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../auth/auth-context'
import { todayBRT } from '../lib/dates'
import { ImportModal } from './Evolution'
import { ImportRuns } from './RunImport'

/** Configurações: trazer o histórico de outros apps (Hevy, Strava, Garmin). */
export function ImportFromApps() {
  const todayIso = todayBRT()
  // A conta demo é pública: o banco não aceita importar do Hevy nela (corrida, sim, como o treino do app).
  const demo = Boolean(useAuth().profile?.is_demo)
  const [open, setOpen] = useState<'hevy' | 'corrida' | null>(null)

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="eyebrow">Importar de outros apps</h2>
        <p className="mt-1 text-sm text-muted">
          Traga o que você já registrou em outro app. Entra na sua Evolução e nada é duplicado se importar de novo.
        </p>
      </div>
      <ul className="divide-y divide-line">
        <Row
          icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}
          title="Hevy"
          subtitle="Treinos de musculação (arquivo CSV)"
          disabled={demo}
          note={demo ? 'Na conta de demonstração não dá para importar do Hevy. Crie sua conta para trazer seus treinos.' : undefined}
          onClick={() => setOpen('hevy')}
        />
        <Row
          icon={<Footprints className="h-5 w-5" aria-hidden="true" />}
          title="Strava, Garmin e outros"
          subtitle="Corridas, caminhadas e pedal (arquivos GPX ou TCX)"
          onClick={() => setOpen('corrida')}
        />
      </ul>
      {open === 'hevy' && <ImportModal todayIso={todayIso} onClose={() => setOpen(null)} />}
      {open === 'corrida' && <ImportRuns todayIso={todayIso} onClose={() => setOpen(null)} />}
    </div>
  )
}

function Row({
  icon,
  title,
  subtitle,
  note,
  disabled = false,
  onClick,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  note?: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <li className="space-y-1 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender/20">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs text-muted">{subtitle}</span>
        </span>
        <button
          type="button"
          className="btn-outline shrink-0 gap-1.5 px-3 py-2 text-sm"
          disabled={disabled}
          onClick={onClick}
          aria-label={`Importar do ${title}`}
        >
          <Upload className="h-4 w-4" aria-hidden="true" /> Importar
        </button>
      </div>
      {note && <p className="text-xs text-muted">{note}</p>}
    </li>
  )
}
