import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Spinner'
import type { Role } from '../types'

interface RoleGuardProps {
  allowedRole: Role
  /** Rota para redirecionar quando o role NÃO bater (ex: funcionário tentando /admin) */
  redirectTo: string
}

export function RoleGuard({ allowedRole, redirectTo }: RoleGuardProps) {
  const { profile, loading } = useAuth()

  // Aguarda o bootstrap de sessão/perfil
  if (loading) return <Spinner />

  // Sem profile: sessão existe mas perfil não foi resolvido ainda ou é inválido.
  // AuthRedirect é o único ponto de resolução — evita loop /admin <-> /punch.
  if (!profile) return <Navigate to="/auth/redirect" replace />

  if (profile.role !== allowedRole) return <Navigate to={redirectTo} replace />

  return <Outlet />
}
