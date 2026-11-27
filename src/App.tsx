import {
  BadgeCheck,
  CalendarDays,
  ChartNoAxesColumn,
  Heart,
  History,
  House,
  MessageSquare,
  Settings,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/auth-context'
import { homeFor } from './auth/home'
import { RequireProProfile } from './auth/RequireProProfile'
import { RequireRole } from './auth/RequireRole'
import { AcompanhamentoRedirect } from './components/AcompanhamentoTabs'
import { AppLayout } from './components/AppLayout'
import type { NavItem } from './components/BottomNav'
import { FullScreenLoader } from './components/FullScreenLoader'
import { pendingInvitePath } from './lib/invite'
import { supabaseConfigured } from './lib/supabase'
import { Configuracoes } from './pages/Configuracoes'
import { ConfigMissing } from './pages/ConfigMissing'
import { Convite } from './pages/Convite'
import { Login } from './pages/Login'
import { NotFound } from './pages/NotFound'

// Cada tela é baixada só quando é aberta: o celular não precisa carregar o
// painel do profissional (nem o mapa) para mostrar o Início da pessoa.
const Inicio = lazy(() => import('./pages/pessoa/Inicio').then((m) => ({ default: m.Inicio })))
const PerfilProfissional = lazy(() =>
  import('./pages/pessoa/PerfilProfissional').then((m) => ({ default: m.PerfilProfissional })),
)
const Comparar = lazy(() => import('./pages/pessoa/Comparar').then((m) => ({ default: m.Comparar })))
const PertoDeVoce = lazy(() => import('./pages/pessoa/PertoDeVoce').then((m) => ({ default: m.PertoDeVoce })))
const Plano = lazy(() => import('./pages/pessoa/Plano').then((m) => ({ default: m.Plano })))
const TreinoMontar = lazy(() => import('./pages/pessoa/TreinoMontar').then((m) => ({ default: m.TreinoMontar })))
const TreinoAtivo = lazy(() => import('./pages/pessoa/TreinoAtivo').then((m) => ({ default: m.TreinoAtivo })))
const Exercicio = lazy(() => import('./pages/pessoa/Exercicio').then((m) => ({ default: m.Exercicio })))
const Exercicios = lazy(() => import('./pages/pessoa/Exercicios').then((m) => ({ default: m.Exercicios })))
const Corrida = lazy(() => import('./pages/pessoa/Corrida').then((m) => ({ default: m.Corrida })))
const Progresso = lazy(() => import('./pages/pessoa/Progresso').then((m) => ({ default: m.Progresso })))
const ResumoSemana = lazy(() => import('./pages/pessoa/ResumoSemana').then((m) => ({ default: m.ResumoSemana })))
const Rotina = lazy(() => import('./pages/pessoa/Rotina').then((m) => ({ default: m.Rotina })))
const Saude = lazy(() => import('./pages/pessoa/Saude').then((m) => ({ default: m.Saude })))
const Paciente = lazy(() => import('./pages/profissional/Paciente').then((m) => ({ default: m.Paciente })))
const MensagensPro = lazy(() => import('./pages/profissional/Mensagens').then((m) => ({ default: m.Mensagens })))
const MensagensPessoa = lazy(() => import('./pages/pessoa/Mensagens').then((m) => ({ default: m.Mensagens })))
const CompletarPerfil = lazy(() =>
  import('./pages/profissional/CompletarPerfil').then((m) => ({ default: m.CompletarPerfil })),
)
const Hoje = lazy(() => import('./pages/profissional/Hoje').then((m) => ({ default: m.Hoje })))
const Agenda = lazy(() => import('./pages/profissional/Agenda').then((m) => ({ default: m.Agenda })))
const Pacientes = lazy(() => import('./pages/profissional/Pacientes').then((m) => ({ default: m.Pacientes })))
const Comunidade = lazy(() => import('./pages/Comunidade').then((m) => ({ default: m.Comunidade })))
const Registros = lazy(() => import('./pages/equipe/Registros').then((m) => ({ default: m.Registros })))

// Pessoa: quatro abas. Plano, rotina e profissionais ficam dentro de Acompanhamento.
const PERSON_NAV: NavItem[] = [
  { to: '/inicio', label: 'Início', icon: House },
  { to: '/comunidade', label: 'Comunidade', icon: UsersRound },
  {
    to: '/acompanhamento',
    label: 'Acompanhamento',
    icon: Heart,
    alsoActiveOn: ['/plano', '/rotina', '/saude'],
  },
  { to: '/progresso', label: 'Evolução', icon: ChartNoAxesColumn },
  // No celular, mensagens e configurações abrem pelos ícones no topo do Início.
  { to: '/mensagens', label: 'Mensagens', icon: MessageSquare, desktopOnly: true, unreadFor: 'person' },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, desktopOnly: true },
]

// Profissional: abre em Hoje, com quem espera retorno.
const PRO_NAV: NavItem[] = [
  { to: '/pro', label: 'Hoje', icon: House, end: true },
  { to: '/pro/clientes', label: 'Clientes', icon: Users, alsoActiveOn: ['/pro/pacientes'] },
  { to: '/pro/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/pro/comunidade', label: 'Comunidade', icon: UsersRound },
  // No celular, as mensagens abrem pelo ícone no topo de Hoje.
  { to: '/pro/mensagens', label: 'Mensagens', icon: MessageSquare, desktopOnly: true, unreadFor: 'professional' },
  // Dados, oferta, fotos e avaliações ficam no perfil.
  { to: '/pro/configuracoes', label: 'Perfil', icon: UserRound },
]

// Equipe Skyro: só quem tem papel admin (dado por SQL).
const TEAM_NAV: NavItem[] = [
  { to: '/equipe', label: 'Pendentes', icon: BadgeCheck, end: true },
  { to: '/equipe/decididos', label: 'Decididos', icon: History },
  { to: '/equipe/configuracoes', label: 'Configurações', icon: Settings },
]

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

/** "/" manda cada um para a sua home (ou para o login). */
function RootRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/entrar" replace />
  return <Navigate to={profile ? (pendingInvitePath(profile.role) ?? homeFor(profile.role)) : '/entrar'} replace />
}

export default function App() {
  if (!supabaseConfigured) return <ConfigMissing />

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/entrar" element={<Login />} />
              <Route path="/convite/:id" element={<Convite />} />

              {/* App da pessoa */}
              <Route
                element={
                  <RequireRole role="person">
                    <AppLayout nav={PERSON_NAV} />
                  </RequireRole>
                }
              >
                <Route path="/inicio" element={<Inicio />} />
                <Route path="/acompanhamento" element={<AcompanhamentoRedirect />} />
                <Route path="/saude" element={<Saude />} />
                <Route path="/saude/perto" element={<PertoDeVoce />} />
                <Route path="/saude/comparar" element={<Comparar />} />
                <Route path="/saude/profissional/:id" element={<PerfilProfissional />} />
                <Route path="/mensagens" element={<MensagensPessoa />} />
                <Route path="/mensagens/:proId" element={<MensagensPessoa />} />
                <Route path="/saude/mensagens" element={<Navigate to="/mensagens" replace />} />
                <Route path="/rotina" element={<Rotina />} />
                <Route path="/plano" element={<Plano />} />
                <Route path="/plano/treino" element={<TreinoAtivo />} />
                <Route path="/plano/treinos/novo" element={<TreinoMontar />} />
                <Route path="/plano/treinos/:id" element={<TreinoMontar />} />
                <Route path="/plano/exercicio/:nome" element={<Exercicio />} />
                <Route path="/plano/exercicios" element={<Exercicios />} />
                <Route path="/plano/corrida" element={<Corrida />} />
                <Route path="/perfil" element={<Navigate to="/configuracoes" replace />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="/progresso" element={<Progresso />} />
                <Route path="/progresso/semana" element={<ResumoSemana />} />
                <Route path="/comunidade" element={<Comunidade />} />
              </Route>

              {/* App do profissional */}
              <Route
                element={
                  <RequireRole role="professional">
                    <RequireProProfile>
                      <AppLayout nav={PRO_NAV} wide />
                    </RequireProProfile>
                  </RequireRole>
                }
              >
                <Route path="/pro" element={<Hoje />} />
                <Route path="/pro/clientes" element={<Pacientes />} />
                <Route path="/pro/pacientes/:id" element={<Paciente />} />
                <Route path="/pro/agenda" element={<Agenda />} />
                <Route path="/pro/comunidade" element={<Comunidade />} />
                <Route path="/pro/mensagens" element={<MensagensPro />} />
                <Route path="/pro/mensagens/:personId" element={<MensagensPro />} />
                <Route path="/pro/perfil" element={<Navigate to="/pro/configuracoes" replace />} />
                <Route path="/pro/perfil/galeria" element={<Navigate to="/pro/configuracoes/galeria" replace />} />
                <Route path="/pro/configuracoes" element={<Configuracoes />} />
                <Route path="/pro/configuracoes/galeria" element={<Configuracoes />} />
              </Route>

              {/* Área da equipe: aprovar ou recusar registros de conselho */}
              <Route
                element={
                  <RequireRole role="admin">
                    <AppLayout nav={TEAM_NAV} wide />
                  </RequireRole>
                }
              >
                <Route path="/equipe" element={<Registros view="pendentes" />} />
                <Route path="/equipe/decididos" element={<Registros view="decididos" />} />
                <Route path="/equipe/configuracoes" element={<Configuracoes />} />
              </Route>

              {/* Fora do painel: quem ainda não tem perfil profissional completo */}
              <Route
                path="/pro/completar-perfil"
                element={
                  <RequireRole role="professional">
                    <CompletarPerfil />
                  </RequireRole>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
