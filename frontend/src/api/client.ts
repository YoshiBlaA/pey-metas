// Cliente HTTP mínimo sobre fetch, con tipos, manejo de ErrorResponse y token Bearer.
import type { ErrorResponse, FieldError } from './types'

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

/** Error que lanzamos para cualquier respuesta no exitosa (o fallo de red). */
export class ApiError extends Error {
  readonly status: number
  /** Errores por campo: { amount: 'debe ser mayor a 0', ... } */
  readonly fieldErrors: Record<string, string>

  constructor(status: number, message: string, errors: FieldError[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = Object.fromEntries(errors.map((e) => [e.field, e.message]))
  }
}

// --- Token: lo guarda AuthContext, aquí solo lo leemos -----------------------------
let getToken: () => string | null = () => null
let onUnauthorized: () => void = () => {}

/** AuthContext registra cómo obtener el token y qué hacer ante un 401. */
export function configureAuth(opts: { getToken: () => string | null; onUnauthorized: () => void }) {
  getToken = opts.getToken
  onUnauthorized = opts.onUnauthorized
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  /** true = agrega Authorization: Bearer y aplica logout si responde 401. */
  auth?: boolean
  query?: Record<string, string | number | undefined>
  signal?: AbortSignal
}

/** Mensajes amigables si el backend no manda "message". */
function defaultMessage(status: number): string {
  if (status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.'
  if (status === 403) return 'No tienes permiso para hacer esto.'
  if (status === 404) return 'No encontramos lo que buscas.'
  if (status === 409) return 'Esta meta ya está cerrada.'
  if (status === 502) return 'El servicio de pagos no respondió. Intenta de nuevo en un momento.'
  if (status >= 500) return 'Ocurrió un error en el servidor. Intenta más tarde.'
  return 'No pudimos completar la operación.'
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(API_URL + path)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v))
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'No hay conexión con el servidor. Revisa tu internet o que el backend esté encendido.')
  }

  if (!res.ok) {
    // Intentamos leer el ErrorResponse del backend; si no es JSON usamos un mensaje genérico.
    let body: Partial<ErrorResponse> | null = null
    try {
      body = (await res.json()) as Partial<ErrorResponse>
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    if (res.status === 401 && opts.auth) onUnauthorized()
    throw new ApiError(res.status, body?.message || defaultMessage(res.status), body?.errors ?? [])
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** Convierte cualquier error en un texto para mostrar al usuario. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Ocurrió un error inesperado.'
}

/** Lo usan los mocks para imitar un 401 real (dispara el logout). */
export function triggerUnauthorized() {
  onUnauthorized()
}
