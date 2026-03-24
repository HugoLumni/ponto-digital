import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/Spinner'

/**
 * Resolvedor central de sessão/perfil.
 * Aguarda loading=false antes de agir.
 * Nunca faz signOut automático.
 */
export function AuthRedirect() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (!profile) {
      // Sessão válida mas sem perfil — aguarda um ciclo extra antes de desistir.
      // Isso cobre o caso em que o banco ainda não respondeu.
      const timer = setTimeout(() => {
        navigate('/login', { replace: true })
      }, 2000)
      return () => clearTimeout(timer)
    }

    navigate(profile.role === 'admin' ? '/admin' : '/punch', { replace: true })
  }, [loading, user, profile, navigate])

  return <Spinner />
}
