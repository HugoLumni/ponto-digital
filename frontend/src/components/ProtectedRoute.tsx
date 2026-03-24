import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Spinner'

/**
 * Decide apenas: "existe sessão ativa?"
 * Aguarda sessionReady antes de qualquer decisão.
 */
export function ProtectedRoute() {
  const { user, sessionReady } = useAuth()

  if (!sessionReady) return <Spinner />

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
