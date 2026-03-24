import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import { Spinner } from '../components/Spinner'

/**
 * Ponto único de resolução de sessão/perfil.
 * - Aguarda o bootstrap do AuthProvider (loading).
 * - Com sessão + perfil válido: redireciona por role.
 * - Com sessão + sem perfil: faz signOut e vai para /login.
 * - Sem sessão: vai para /login.
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
      // Sessão válida mas sem perfil correspondente — limpa e reinicia.
      supabase.auth.signOut().then(() => {
        navigate('/login', { replace: true })
      })
      return
    }

    navigate(profile.role === 'admin' ? '/admin' : '/punch', { replace: true })
  }, [loading, user, profile, navigate])

  return <Spinner />
}
