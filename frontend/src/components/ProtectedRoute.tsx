import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from './Spinner'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) return <Spinner />

  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
