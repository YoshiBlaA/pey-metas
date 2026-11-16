// 08 · Login de administración (1440×900): panel verde a la izquierda y tarjeta de 440px.
// La misma pantalla sirve para "Crear cuenta" (mode="register"): cualquiera puede registrarse y manejar sus metas.
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { USE_MOCKS, publicApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { MockBanner } from '../../components/Layouts'
import { TextField } from '../../components/Field'
import { Button } from '../../components/Button'
import { ErrorAlert } from '../../components/ErrorAlert'
import { EyeIcon, LockIcon, MailIcon, ShieldIcon, UserIcon } from '../../components/Icons'
import { formatMoney } from '../../lib/format'
import { useIsAdminDesktop } from '../../hooks/useMediaQuery'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterPage() {
  return <LoginPage mode="register" />
}

export function LoginPage({ mode = 'login' }: { mode?: 'login' | 'register' }) {
  const registering = mode === 'register'
  const { login, register, isAuthenticated } = useAuth()
  const [name, setName] = useState('')
  const [confirm, setConfirm] = useState('')
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/admin'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  // Sin marcar: la sesión vive en sessionStorage (se borra al cerrar el navegador). Marcado: localStorage.
  const [remember, setRemember] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(false)
  // Cifras reales para el panel decorativo (endpoint público, no requiere login).
  const { data: goals } = useAsync(() => publicApi.listGoals(), [])
  const desktop = useIsAdminDesktop()

  if (isAuthenticated && !loading) return <Navigate to={from} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (registering) {
      const problem = !name.trim()
        ? 'Escribe tu nombre o el de tu organización.'
        : !EMAIL_RE.test(username.trim())
          ? 'Escribe un correo válido.'
          : password.length < 8
            ? 'La contraseña debe tener al menos 8 caracteres.'
            : password !== confirm
              ? 'Las contraseñas no coinciden.'
              : null
      if (problem) {
        setError(problem)
        return
      }
    } else if (!username.trim() || !password) {
      setError('Escribe tu usuario y contraseña.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      if (registering) await register(name.trim(), username.trim(), password, remember)
      else await login(username.trim(), password, remember)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }

  const raised = goals?.reduce((s, g) => s + g.raisedAmount, 0)
  const achieved = goals?.filter((g) => g.status === 'CLOSED').length

  const fields = (
    <>
      {registering && (
        <TextField
          label="Nombre o organización"
          prefix={<UserIcon className="size-[18px]" />}
          value={name}
          maxLength={100}
          showCount={false}
          onChange={(e) => setName(e.target.value)}
          autoComplete="organization"
          placeholder="Ej. Familia Ramírez"
          autoFocus={desktop}
        />
      )}
      <TextField
        label={registering ? 'Correo' : 'Correo o usuario'}
        type={registering ? 'email' : 'text'}
        prefix={<MailIcon className="size-[18px]" />}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete={registering ? 'email' : 'username'}
        autoFocus={desktop && !registering}
      />
      <TextField
        label="Contraseña"
        type={showPwd ? 'text' : 'password'}
        prefix={<LockIcon className="size-[18px]" />}
        suffix={
          <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPwd} className="text-ink-400 hover:text-ink-700">
            <EyeIcon className="size-[18px]" />
          </button>
        }
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={registering ? 'new-password' : 'current-password'}
        hint={registering ? 'Mínimo 8 caracteres' : undefined}
      />
      {registering && (
        <TextField
          label="Confirma tu contraseña"
          type={showPwd ? 'text' : 'password'}
          prefix={<LockIcon className="size-[18px]" />}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
      )}
      <div className="-mt-1 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink-700">
          <input type="checkbox" className="ui-check" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Recordarme
        </label>
        {!registering && (
          <button type="button" className="text-[14px] font-semibold text-brand-700 hover:underline" onClick={() => setForgot((v) => !v)} aria-expanded={forgot}>
            ¿Olvidaste tu contraseña?
          </button>
        )}
      </div>
      {forgot && !registering && (
        <p className="t-body rounded-xl bg-brand-50 px-3.5 py-3 !text-brand-700" role="status">
          Por seguridad la contraseña no se restablece desde aquí. Pide al administrador del sistema que te asigne una nueva.
        </p>
      )}
      <ErrorAlert error={error} />
      <Button type="submit" loading={loading}>{registering ? 'Crear cuenta' : 'Entrar'}</Button>
      <p className="t-body text-center">
        {registering ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
        <Link to={registering ? '/admin/login' : '/admin/registro'} className="font-semibold text-brand-700 hover:underline">
          {registering ? 'Inicia sesión' : 'Crea una gratis'}
        </Link>
      </p>
    </>
  )
  const heading = registering ? 'Crea tu cuenta' : 'Inicia sesión'
  const subheading = registering ? 'Crea metas y recibe aportaciones con CoDi.' : 'Panel de administración de Pey Metas'
  const jwt = (
    <p className="t-cap flex items-center justify-center gap-1.5 !text-ink-400">
      <ShieldIcon className="size-3.5" /> Acceso seguro con token (JWT)
    </p>
  )
  const demo = USE_MOCKS && <p className="t-cap text-center !text-pending-text">Modo demo: usuario <b>admin</b>, contraseña <b>admin123</b></p>
  const brand = (
    <Link to="/" className="flex items-center gap-2" aria-label="Pey Metas, inicio">
      <span className="ui-tile size-8 !rounded-[10px] bg-white/20 text-[18px] font-extrabold">P</span>
      <span className="text-[19px] font-extrabold">Pey</span>
      <span className="-ml-1 text-[19px] font-medium text-[#BDF0D9]">Metas</span>
    </Link>
  )
  const gradient = 'linear-gradient(150deg,#057A55 0%,#0E9F6E 55%,#3CC48E 100%)'

  // ---- móvil (390×844): encabezado verde de 330px y tarjeta encimada ----
  if (!desktop)
    return (
      <div className="min-h-dvh pb-8">
        <MockBanner />
        <div className="relative isolate flex h-[330px] flex-col gap-3.5 overflow-hidden px-6 pt-5 text-white" style={{ background: gradient }}>
          <span className="lp-blob" style={{ background: '#7266CC', width: 240, height: 240, top: -60, right: -110, opacity: 0.55, zIndex: -1 }} aria-hidden />
          {brand}
          <h2 className="text-[26px] font-extrabold leading-[33px]">Administra tus metas y recibe aportaciones con CoDi.</h2>
          <p className="text-[14px] leading-[21px] text-[#D7F5E8]">Crea metas, define montos sugeridos y sigue cada pago en tiempo real.</p>
        </div>
        <div className="relative -mt-11 px-5">
          <form onSubmit={onSubmit} noValidate className="ui-card mx-auto max-w-[440px]" style={{ padding: '24px 20px', gap: 18 }}>
            <div className="flex flex-col gap-1">
              <h1 className="t-h2">{heading}</h1>
              <p className="t-body">{subheading}</p>
            </div>
            {fields}
            {!registering && demo}
          </form>
        </div>
        <div className="mt-[18px]">{jwt}</div>
      </div>
    )

  return (
    <div className="flex min-h-dvh flex-col">
      <MockBanner />
      <div className="flex flex-1">
        <div className="relative flex w-[620px] shrink-0 flex-col justify-between overflow-hidden p-14 text-white" style={{ background: gradient }}>
          <span className="lp-blob" style={{ background: '#7266CC', width: 360, height: 360, bottom: -120, right: -120, opacity: 0.55 }} aria-hidden />
          <span className="lp-blob" style={{ background: '#B6A3EB', width: 200, height: 200, top: 120, left: -80, opacity: 0.3, animationDelay: '-8s' }} aria-hidden />
          <span className="relative">{brand}</span>
          <div className="relative flex flex-col gap-4">
            <h2 className="text-[40px] font-extrabold leading-[48px]">Administra tus metas y recibe aportaciones con CoDi.</h2>
            <p className="text-[16px] leading-6 text-[#D7F5E8]">Crea metas, define montos sugeridos y sigue cada pago en tiempo real.</p>
          </div>
          <div className="relative flex gap-4">
            <LoginStat value={raised !== undefined ? formatMoney(raised) : '—'} label="recaudados en total" />
            <LoginStat value={achieved !== undefined ? String(achieved) : '—'} label="metas logradas" />
          </div>
        </div>
        <main className="flex flex-1 items-center justify-center p-6">
          <form onSubmit={onSubmit} noValidate className="ui-card w-full max-w-[440px]" style={{ padding: 40, gap: 22 }}>
            <div className="flex flex-col gap-1.5">
              <h1 className="t-h1">{heading}</h1>
              <p className="t-body">{subheading}</p>
            </div>
            {fields}
            {jwt}
            {!registering && demo}
          </form>
        </main>
      </div>
    </div>
  )
}

function LoginStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-white/15 p-4">
      <div className="text-2xl font-extrabold tabular-nums">{value}</div>
      <div className="text-xs font-medium text-[#D7F5E8]">{label}</div>
    </div>
  )
}
