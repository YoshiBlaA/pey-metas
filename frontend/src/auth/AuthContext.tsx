// Sesión del administrador: guarda el token (localStorage con "Recordarme", si no sessionStorage) y lo comparte con toda la app.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { adminApi, configureAuth } from '../api'
import { clearStoredSession, readStoredSession, writeStoredSession, type StoredSession } from '../lib/authStorage'

type Session = StoredSession

interface AuthContextValue {
  session: Session | null
  isAuthenticated: boolean
  /** remember = true guarda la sesión en localStorage; false, en sessionStorage. */
  login: (username: string, password: string, remember?: boolean) => Promise<void>
  /** Crea la cuenta y deja la sesión iniciada. */
  register: (name: string, email: string, password: string, remember?: boolean) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readSession(): Session | null {
  const s = readStoredSession()
  return s && s.expiresAt > Date.now() ? s : null // token vencido = sin sesión
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession)

  const logout = useCallback(() => {
    clearStoredSession()
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

  /** Guarda el token y completa usuario y nombre con /api/admin/me (que además valida el token). */
  const start = useCallback(async (token: string, expiresIn: number, username: string, remember: boolean) => {
    const s: Session = { token, username, expiresAt: Date.now() + expiresIn * 1000 }
    writeStoredSession(s, remember)
    setSession(s)
    const me = await adminApi.me()
    const withName = { ...s, username: me.username, name: me.name }
    writeStoredSession(withName, remember)
    setSession(withName)
  }, [])

  const login = useCallback(async (username: string, password: string, remember = false) => {
    const res = await adminApi.login({ username, password })
    await start(res.token, res.expiresIn, username, remember)
  }, [start])

  const register = useCallback(async (name: string, email: string, password: string, remember = false) => {
    const res = await adminApi.register({ name, email, password })
    await start(res.token, res.expiresIn, email, remember)
  }, [start])

  const value = useMemo(
    () => ({ session, isAuthenticated: session !== null, login, register, logout }),
    [session, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
