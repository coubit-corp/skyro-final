import { FileUp } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useSaveRuns } from '../hooks/useRunning'
import { evolutionDate } from '../lib/evolution'
import { MAX_RUN_FILES, parseRunFile, RUN_FILE_MAX_BYTES, runSummary, SPORT_LABEL, type ParsedRun } from '../lib/running'
import { Modal } from './ui'

/** Importar corridas, caminhadas e pedais de arquivos GPX/TCX (Strava, Garmin e outros). */
export function ImportRuns({ todayIso, onClose }: { todayIso: string; onClose: () => void }) {
  const save = useSaveRuns()
  const input = useRef<HTMLInputElement>(null)
  const [found, setFound] = useState<ParsedRun[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const onFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length === 0) return
    if (files.length > MAX_RUN_FILES) return setError(`Escolha até ${MAX_RUN_FILES} arquivos por vez.`)
    save.reset()
    const ok: ParsedRun[] = []
    const bad: string[] = []
    for (const f of files) {
      if (f.size > RUN_FILE_MAX_BYTES) {
        bad.push(`${f.name} (passa de 15 MB)`)
        continue
      }
      const run = parseRunFile(await f.text(), todayIso)
      if (run && !ok.some((r) => r.source_key === run.source_key)) ok.push(run)
      else if (!run) bad.push(f.name)
    }
    setFound(ok.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on)))
    setSkipped(bad)
    setError(ok.length === 0 ? 'Não reconhecemos nenhuma atividade. Use arquivos GPX ou TCX com horário.' : null)
  }

  const result = save.data
  return (
    <Modal open onClose={onClose} title="Importar corridas">
      {result ? (
        <>
          <p className="text-sm">
            {result.added === 0
              ? 'Essas atividades já estavam registradas. Nada foi duplicado.'
              : `${result.added} ${result.added === 1 ? 'atividade entrou' : 'atividades entraram'} na sua história.`}
            {result.added > 0 && result.repeated > 0 && ` ${result.repeated} já estavam e não foram repetidas.`}
          </p>
          <button type="button" className="btn-primary w-full" onClick={onClose}>
            Fechar
          </button>
        </>
      ) : (
        <>
          <div className="space-y-1 text-sm text-muted">
            <p>
              <span className="font-semibold text-ink">Strava:</span> no site, abra a atividade → menu “…” → Exportar GPX. Para
              todas de uma vez: Configurações → Minha conta → Baixar ou excluir sua conta → Solicitar arquivo.
            </p>
            <p>
              <span className="font-semibold text-ink">Garmin Connect:</span> abra a atividade → engrenagem → Exportar para TCX ou
              GPX.
            </p>
            <p>Arquivos FIT ainda não são aceitos. Você confere tudo antes de salvar.</p>
          </div>
          <input
            ref={input}
            type="file"
            multiple
            accept=".gpx,.tcx,application/gpx+xml,application/xml,text/xml"
            className="sr-only"
            onChange={onFiles}
            aria-label="Arquivos de corrida (GPX ou TCX)"
          />
          <button type="button" className="btn-outline w-full gap-2" onClick={() => input.current?.click()}>
            <FileUp className="h-4 w-4" aria-hidden="true" /> {found.length ? 'Escolher outros arquivos' : 'Escolher arquivos'}
          </button>
          {error && (
            <p className="text-sm text-attention" role="alert">
              {error}
            </p>
          )}
          {found.length > 0 && (
            <ul className="max-h-60 space-y-2 overflow-y-auto rounded-xl border border-line p-3 text-sm">
              {found.map((r) => (
                <li key={r.source_key}>
                  <p className="font-semibold break-words">
                    {r.title} · {SPORT_LABEL[r.details.sport]}
                  </p>
                  <p className="text-muted">
                    {evolutionDate(r.occurred_on, todayIso)} · {runSummary(r.details)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {skipped.length > 0 && (
            <p className="text-xs text-muted">
              Ficaram de fora (não reconhecidos, sem horário ou com data no futuro): {skipped.join(', ')}
            </p>
          )}
          {save.error && (
            <p className="text-sm text-attention" role="alert">
              {save.error.message}
            </p>
          )}
          <div className="flex gap-2">
            <button type="button" className="btn-outline flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="btn-primary flex-1" disabled={!found.length || save.isPending} onClick={() => save.mutate(found)}>
              {save.isPending ? 'Salvando…' : found.length ? `Salvar ${found.length}` : 'Salvar'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
