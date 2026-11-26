import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { hasUnsavedText } from './lib/pwaUpdate'
import { reloadForNewVersion } from './lib/staleVersion'
import './index.css'
import { applyTheme, readThemePref, watchSystemTheme } from './lib/theme'

// O index.html já aplicou o tema antes de carregar; aqui só confirma e acompanha o sistema.
applyTheme(readThemePref())
watchSystemTheme()

// Uma versão nova foi publicada com a aba aberta: os arquivos antigos sumiram, então recarrega para pegar os novos
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault()
})

// App instalável (PWA): quando sai uma versão nova, ela entra recarregando a
// página, mas só quando não há texto digitado na tela (para não apagar rascunhos).
// Procura versão nova ao voltar para o app e a cada hora.
let updatePending = false
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updatePending = true
    applyUpdateIfSafe()
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {})
    })
  },
})

function applyUpdateIfSafe() {
  if (!updatePending || hasUnsavedText(document.querySelectorAll<HTMLInputElement>('input, textarea'))) return
  updatePending = false
  // A aba aberta antes do service worker existir não recebe o reload do plugin: recarrega aqui
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
  void updateSW(true)
}
// Com rascunho na tela, tenta de novo depois (quando a pessoa já enviou ou apagou o texto)
setInterval(applyUpdateIfSafe, 30 * 1000)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
