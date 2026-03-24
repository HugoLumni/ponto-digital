import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Spinner'
import type { Role } from '../types'

interface RoleGuardProps {
  allowedRole: Role
  redirectTo: string
}

export function RoleGuard({ allowedRole, redirectTo }: RoleGuardProps) {
  const { profile, loading, profileResolved } = useAuth()

  // Aguarda sessão e perfil serem resolvidos.
  if (loading || !profileResolved) return <Spinner />

  // Sem profile após resolução completa: vai para /auth/redirect decidir.
  if (!profile) return <Navigate to="/auth/redirect" replace />

  if (profile.role !== allowedRole) return <Navigate to={redirectTo} replace />

  return <Outlet />
}
