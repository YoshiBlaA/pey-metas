// Dónde vive la sesión del admin. "Recordarme" = localStorage (sobrevive al cerrar el navegador);
// sin marcar = sessionStorage (se borra al cerrar la pestaña/navegador).
export const SESSION_KEY = 'pey.admin.session'

export interface StoredSession {
  token: string
  username: string
  /** Momento (ms) en que vence el token, calculado con expiresIn. */
  expiresAt: number
}

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/** Lee la sesión guardada (primero la de esta pestaña, luego la recordada). */
export function readStoredSession(): StoredSession | null {
  const raw = safe(() => sessionStorage.getItem(SESSION_KEY) ?? localStorage.getItem(SESSION_KEY), null)
  if (!raw) return null
  return safe(() => JSON.parse(raw) as StoredSession, null)
}

/** true si la sesión actual está en localStorage (se marcó "Recordarme"). */
export const isRemembered = () => safe(() => localStorage.getItem(SESSION_KEY) !== null, false)

export function writeStoredSession(s: StoredSession, remember: boolean) {
  clearStoredSession()
  safe(() => (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s)), undefined)
}

export function clearStoredSession() {
  safe(() => localStorage.removeItem(SESSION_KEY), undefined)
  safe(() => sessionStorage.removeItem(SESSION_KEY), undefined)
}
