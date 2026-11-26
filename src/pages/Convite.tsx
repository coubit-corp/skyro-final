import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { homeFor } from '../auth/home'
import { FullScreenLoader } from '../components/FullScreenLoader'
import { challengePath, saveInvite } from '../lib/invite'

/** Link de convite para um desafio: guarda o convite e leva para o login ou direto para o desafio. */
export function Convite() {
  const { id = '' } = useParams()
  const { session, profile, loading } = useAuth()

  useEffect(() => {
    if (id) saveInvite(id)
  }, [id])

  if (loading) return <FullScreenLoader />
  if (!session || !profile) return <Navigate to="/entrar" replace />
  return <Navigate to={challengePath(profile.role, id) ?? homeFor(profile.role)} replace />
}
