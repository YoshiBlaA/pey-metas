// 08 · Login de administración.
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { USE_MOCKS } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { Logo } from '../../components/Layouts'
import { TextField } from '../../components/Field'
import { Button } from '../../components/Button'
import { ErrorAlert } from '../../components/ErrorAlert'

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/admin'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)

  if (isAuthenticated && !loading) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('Escribe tu usuario y contraseña.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await login(username.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Panel decorativo (solo escritorio) */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-700 p-12 text-white lg:flex">
        <span className="text-xl font-bold">Pey Metas</span>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Administra tus metas de recaudación</h2>
          <p className="mt-3 max-w-md text-brand-100">Crea metas, ajusta montos sugeridos y sigue su progreso en tiempo real.</p>
        </div>
        <span className="text-sm text-brand-100">Pagos con CoDi</span>
      </div>

      <main className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} noValidate className="w-full max-w-sm space-y-5 rounded-2xl border border-line bg-card p-8 shadow-sm">
          <Logo to="/" />
          <div>
            <h1 className="text-2xl font-bold">Iniciar sesión</h1>
            <p className="text-sm text-ink-700">Acceso para administradores.</p>
          </div>
          <TextField label="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus />
          <TextField label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          <ErrorAlert error={error} />
          <Button type="submit" size="lg" loading={loading}>Entrar</Button>
          {USE_MOCKS && <p className="text-center text-xs text-ink-400">Modo demo: usuario <b>admin</b>, contraseña <b>admin123</b></p>}
        </form>
      </main>
    </div>
  )
}
