import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleGuard } from './components/RoleGuard'
import { Login } from './pages/Login'
import { SetPassword } from './pages/SetPassword'
import { AuthRedirect } from './pages/AuthRedirect'
import { PunchClock } from './pages/PunchClock'
import { AdminDashboard } from './pages/AdminDashboard'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/auth/redirect" element={<AuthRedirect />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<RoleGuard allowedRole="funcionario" redirectTo="/admin" />}>
            <Route path="/punch" element={<PunchClock />} />
          </Route>

          <Route element={<RoleGuard allowedRole="admin" redirectTo="/punch" />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
