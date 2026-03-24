import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/Spinner'

/**
 * Ponto único de resolução de sessão/perfil.
 * - Aguarda o bootstrap do AuthProvider (loading).
 * - Com sessão + perfil válido: redireciona por role.
 * - Com sessão + sem perfil: faz signOut e vai para /login.
 * - Sem sessão: vai para /login.
 */
export function AuthRedirect() {
  const { user, profile, loading, profileResolved } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    // Enquanto o perfil ainda está em resolução, mantém spinner.
    if (!profile && !profileResolved) return

    if (!profile && profileResolved) {
      // Perfil ausente após resolver auth: volta para login sem forçar signOut.
      // Evita deslogar indevidamente em corridas de inicialização no F5.
      navigate('/login', { replace: true })
      return
    }

    if (!profile) return

    navigate(profile.role === 'admin' ? '/admin' : '/punch', { replace: true })
  }, [loading, user, profile, profileResolved, navigate])

  return <Spinner />
}
