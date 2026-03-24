import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { Role } from '../types'

interface RoleGuardProps {
  allowedRole: Role
  redirectTo: string
}

export function RoleGuard({ allowedRole, redirectTo }: RoleGuardProps) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-surface">
        <div className="h-1.5 w-full bg-gradient-to-r from-brand via-forest to-sand" />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      </div>
    )
  }

  // Evita loop /admin <-> /punch quando o profile ainda não foi resolvido
  if (!profile) {
    return <Navigate to="/auth/redirect" replace />
  }

  if (profile.role !== allowedRole) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
