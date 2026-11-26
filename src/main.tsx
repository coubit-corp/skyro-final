import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary'
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

// App instalável (PWA): quando sai uma versão nova, o service worker novo assume
// e a página recarrega sozinha. Procura versão nova ao voltar para o app e a cada hora.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => registration.update().catch(() => {})
    setInterval(check, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)
