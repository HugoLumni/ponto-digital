import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Spinner'
import type { Role } from '../types'

interface RoleGuardProps {
  allowedRole: Role
  redirectTo: string
}

export function RoleGuard({ allowedRole, redirectTo }: RoleGuardProps) {
  const { profile, loading } = useAuth()

  if (loading) return <Spinner />

  if (!profile) return <Navigate to="/auth/redirect" replace />

  if (profile.role !== allowedRole) return <Navigate to={redirectTo} replace />

  return <Outlet />
}
