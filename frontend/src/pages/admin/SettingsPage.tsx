// Configuración (admin): perfil del administrador y datos de la sesión. Simple, sin diseño propio en Figma.
import { useNavigate } from 'react-router-dom'
import { USE_MOCKS, adminApi } from '../../api'
import { useAuth } from '../../auth/AuthContext'
import { useAsync } from '../../hooks/useAsync'
import { useIsAdminDesktop } from '../../hooks/useMediaQuery'
import { Logo } from '../../components/Layouts'
import { Button } from '../../components/Button'
import { ErrorAlert } from '../../components/ErrorAlert'
import { EyeIcon, LogoutIcon, ShieldIcon } from '../../components/Icons'
import { formatDateTime, initials } from '../../lib/format'
import { isRemembered } from '../../lib/authStorage'

const ROLE_TEXT: Record<string, string> = { ROLE_ADMIN: 'Administrador' }

export function SettingsPage() {
  const desktop = useIsAdminDesktop()
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const { data: me, error } = useAsync(() => adminApi.me(), [])
  const name = me?.username ?? session?.username ?? ''
  const onLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const rows: [string, string][] = [
    ['Usuario', name || '—'],
    ['Rol', me ? me.roles.map((r) => ROLE_TEXT[r] ?? r).join(', ') : '—'],
    ['Sesión vence', session ? formatDateTime(new Date(session.expiresAt).toISOString()) : '—'],
    ['Recordar sesión', isRemembered() ? 'Sí, en este navegador' : 'No, se cierra al cerrar el navegador'],
    ['Datos', USE_MOCKS ? 'Modo demo (datos de prueba)' : 'Servidor real'],
  ]

  const content = (
    <>
      <section className="ui-card" style={{ gap: 16 }}>
        <div className="flex items-center gap-3">
          <span className="ui-tile size-12 !rounded-full bg-achieved-50 text-[15px] font-bold text-achieved">{initials(name || '?')}</span>
          <div className="flex flex-col">
            <span className="t-h3">{name}</span>
            <span className="t-cap !text-ink-400">Administrador</span>
          </div>
        </div>
        <dl className="flex flex-col divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-3">
              <dt className="t-body">{k}</dt>
              <dd className="t-strong text-right">{v}</dd>
            </div>
          ))}
        </dl>
        <ErrorAlert error={error} />
      </section>

      <section className="ui-card" style={{ gap: 12 }}>
        <h2 className="t-h3">Contraseña</h2>
        <p className="t-body">Por seguridad la contraseña no se cambia desde el panel. Pide al administrador del sistema que la actualice en el servidor.</p>
      </section>

      <div className="ui-card ui-card-flat !flex-row !gap-2.5 !border-brand-100 !bg-brand-50">
        <ShieldIcon className="mt-0.5 size-[18px] shrink-0 text-brand-700" />
        <span className="t-body !text-brand-700">Los cobros se hacen con QR de CoDi vía Pey. Cada QR vence en 20 minutos.</span>
      </div>

      <div className={`flex gap-3 ${desktop ? '' : 'flex-col'}`}>
        <a href="/" target="_blank" rel="noreferrer" className={`ui-btn secondary sm ${desktop ? '!w-56' : '!w-full'}`}><EyeIcon className="size-4" /> Ver sitio público</a>
        <Button variant="danger" size="sm" className={desktop ? '!w-48' : ''} onClick={onLogout}><LogoutIcon className="size-4" /> Cerrar sesión</Button>
      </div>
    </>
  )

  if (!desktop)
    return (
      <>
        <header className="flex h-[60px] items-center px-5"><Logo to="/admin" /></header>
        <div className="ui-content !pt-1" style={{ gap: 14 }}>
          <div className="flex flex-col">
            <h1 className="t-h1">Configuración</h1>
            <p className="t-cap">Tu perfil y tu sesión.</p>
          </div>
          {content}
        </div>
      </>
    )
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="t-h1">Configuración</h1>
        <p className="t-body">Tu perfil de administrador y los datos de tu sesión.</p>
      </div>
      <div className="flex max-w-[720px] flex-col gap-5">{content}</div>
    </>
  )
}
