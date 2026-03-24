import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/Spinner'

/**
 * Resolvedor central de sessão/perfil.
 * Só age depois que loading=false E profileResolved=true.
 * Nunca faz signOut automático — evita deslogar por corrida de inicialização.
 */
export function AuthRedirect() {
  const { user, profile, loading, profileResolved } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Aguarda resolução completa antes de qualquer decisão.
    if (loading || !profileResolved) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (!profile) {
      // Sessão existe mas sem perfil válido mesmo após resolução.
      // Vai para login mas NÃO faz signOut — sessão pode ser válida,
      // apenas o perfil pode estar ausente no banco.
      navigate('/login', { replace: true })
      return
    }

    navigate(profile.role === 'admin' ? '/admin' : '/punch', { replace: true })
  }, [loading, user, profile, profileResolved, navigate])

  return <Spinner />
}
