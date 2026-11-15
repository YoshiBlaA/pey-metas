// Sesión del administrador: guarda el token en localStorage y lo comparte con toda la app.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { adminApi, configureAuth } from '../api'

const STORAGE_KEY = 'pey.admin.session'

interface Session {
  token: string
  username: string
  /** Momento (ms) en que vence el token, calculado con expiresIn. */
  expiresAt: number
}

interface AuthContextValue {
  session: Session | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    return s.expiresAt > Date.now() ? s : null // token vencido = sin sesión
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }, [])

  // Conectamos el cliente HTTP: de dónde sacar el token y qué hacer ante un 401.
  // Se hace durante el render (y no en un efecto) para que esté listo antes de la primera petición.
  configureAuth({ getToken: () => readSession()?.token ?? null, onUnauthorized: logout })

  // Cerramos la sesión automáticamente cuando vence el token.
  useEffect(() => {
    if (!session) return
    const id = window.setTimeout(logout, session.expiresAt - Date.now())
    return () => window.clearTimeout(id)
  }, [session, logout])

  const login = useCallback(async (username: string, password: string) => {
    const res = await adminApi.login({ username, password })
    const s: Session = { token: res.token, username, expiresAt: Date.now() + res.expiresIn * 1000 }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    setSession(s)
    // Validamos el token con /api/admin/me y usamos el nombre que devuelve el backend.
    const me = await adminApi.me()
    const withName = { ...s, username: me.username }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withName))
    setSession(withName)
  }, [])

  const value = useMemo(
    () => ({ session, isAuthenticated: session !== null, login, logout }),
    [session, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
