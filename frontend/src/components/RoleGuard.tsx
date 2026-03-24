import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Spinner'
import type { Role } from '../types'

interface RoleGuardProps {
  allowedRole: Role
  redirectTo: string
}

/**
 * Decide apenas: "o perfil resolvido tem o role correto?"
 *
 * Regras:
 * - profileStatus=loading → spinner (nunca redireciona prematuramente)
 * - profileStatus=ready, role correto → renderiza
 * - profileStatus=ready, role errado → redireciona para redirectTo
 * - profileStatus=missing|error → /auth/redirect para tentar nova resolução
 */
export function RoleGuard({ allowedRole, redirectTo }: RoleGuardProps) {
  const { profile, profileStatus } = useAuth()

  if (profileStatus === 'loading') return <Spinner />

  if (profileStatus === 'missing' || profileStatus === 'error') {
    return <Navigate to="/auth/redirect" replace />
  }

  if (!profile) return <Navigate to="/auth/redirect" replace />

  if (profile.role !== allowedRole) return <Navigate to={redirectTo} replace />

  return <Outlet />
}
