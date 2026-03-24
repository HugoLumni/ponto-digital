import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/Spinner'

/**
 * Resolvedor central de sessão/perfil — não destrutivo.
 *
 * - Aguarda sessionReady + profileStatus final antes de navegar.
 * - Nunca chama signOut automaticamente (evita logout no F5).
 * - Com perfil válido: navega por role.
 * - Sem sessão: vai para /login.
 * - Perfil ausente/erro: vai para /login (sessão permanece ativa).
 */
export function AuthRedirect() {
  const { user, profile, sessionReady, profileStatus } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Aguarda resolução completa antes de qualquer decisão
    if (!sessionReady) return
    if (profileStatus === 'loading') return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (profile && profileStatus === 'ready') {
      navigate(profile.role === 'admin' ? '/admin' : '/punch', { replace: true })
      return
    }

    // profileStatus=missing|error com sessão válida:
    // vai para login sem destruir sessão — usuário pode tentar novamente.
    navigate('/login', { replace: true })
  }, [sessionReady, profileStatus, user, profile, navigate])

  return <Spinner />
}
