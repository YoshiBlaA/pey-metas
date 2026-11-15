import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { adminApi } from '../api'
import { useAuth } from './AuthContext'
import { Spinner } from '../components/Spinner'

/**
 * Envuelve las rutas de admin. Sin sesión -> manda a /admin/login.
 * Con sesión, valida una vez el token con GET /api/admin/me (si responde 401, el cliente hace logout).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
    let alive = true
    adminApi
      .me()
      .catch(() => {}) // un 401 ya dispara logout desde el cliente
      .finally(() => alive && setChecked(true))
    return () => {
      alive = false
    }
  }, [isAuthenticated])

  if (!isAuthenticated) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  if (!checked) return <Spinner label="Verificando sesión…" />
  return <>{children}</>
}
