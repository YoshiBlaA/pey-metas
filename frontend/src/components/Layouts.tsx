import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { USE_MOCKS } from '../api'
import { useAuth } from '../auth/AuthContext'
import { initials } from '../lib/format'
import { BackIcon, EyeIcon, GearIcon, GridIcon, ListIcon, LogoutIcon, SearchIcon, ShieldIcon, UserIcon } from './Icons'
import { useIsAdminDesktop, useIsDesktopWidth } from '../hooks/useMediaQuery'

/** Logo de la marca (tile 32px radio 10 + "Pey Metas" 19px). */
export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2" aria-label="Pey Metas, inicio">
      <span className="ui-tile size-8 !rounded-[10px] bg-brand-600 text-[18px] font-extrabold text-white">P</span>
      <span className="text-[19px] font-extrabold text-ink-900">Pey</span>
      <span className="-ml-1 text-[19px] font-medium text-brand-600">Metas</span>
    </Link>
  )
}

/** Aviso visible cuando la app corre con datos de prueba. */
export function MockBanner() {
  if (!USE_MOCKS) return null
  return (
    <div className="t-small bg-pending-bg px-4 py-1.5 text-center !font-medium text-pending-text">
      Modo demo: datos de prueba (VITE_USE_MOCKS=true)
    </div>
  )
}

/**
 * Layout público. Móvil (< 768px): diseño a 390px, centrado con max-width 480px.
 * Escritorio (>= 768px): nav blanca de 72px, columna de 1200px y footer de 56px (Figma "desktop").
 */
export function PublicLayout() {
  const desktop = useIsDesktopWidth()
  if (!desktop)
    return (
      <div className="min-h-dvh">
        <MockBanner />
        <div className="mx-auto w-full max-w-[480px]">
          <Outlet />
        </div>
      </div>
    )
  return (
    <div className="flex min-h-dvh flex-col">
      <MockBanner />
      <TopNav />
      <main className="mx-auto flex w-full max-w-[1248px] flex-1 flex-col px-6">
        <Outlet />
      </main>
      <footer className="mt-10 border-t border-line bg-card">
        <div className="mx-auto flex h-14 w-full max-w-[1248px] items-center justify-between px-6">
          <span className="t-cap !text-ink-400">© {new Date().getFullYear()} Pey Metas · Montos en MXN</span>
          <span className="t-cap flex items-center gap-1.5 !text-ink-400">
            <ShieldIcon className="size-3.5" /> Pagos seguros con QR de CoDi vía Pey
          </span>
        </div>
      </footer>
    </div>
  )
}

/** Nav pública de escritorio (72px): logo, enlaces (Metas, ¿Cómo funciona?, Preguntas frecuentes) y buscador (lleva a /?q=…). */
function TopNav() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  useEffect(() => setQ(params.get('q') ?? ''), [params])
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex h-[72px] w-full max-w-[1248px] items-center justify-between px-6">
        <div className="flex items-center gap-12">
          <Logo />
          <nav aria-label="Principal" className="flex items-center gap-7">
            {([['/', 'Metas'], ['/como-funciona', '¿Cómo funciona?'], ['/preguntas-frecuentes', 'Preguntas frecuentes']] as const).map(([to, label]) => (
              <NavLink key={to} to={to} end className={({ isActive }) => `text-[14px] font-semibold ${isActive ? 'text-brand-700' : 'text-ink-700 hover:text-ink-900'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            navigate(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/')
          }}
        >
          <label className="ui-input !h-11 !w-[280px] text-[14px]">
            <SearchIcon className="size-4 text-ink-400" />
            <input placeholder="Buscar meta…" aria-label="Buscar meta" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </form>
      </div>
    </header>
  )
}

/** App bar móvil del Figma: 56px, botón circular de 40px, título 17/24 600 centrado. */
export function AppBar({ title, backTo, right }: { title: string; backTo?: string; right?: ReactNode }) {
  return (
    <div className="ui-appbar">
      {backTo ? (
        <Link to={backTo} className="ui-iconbtn" aria-label="Regresar">
          <BackIcon />
        </Link>
      ) : (
        <span className="size-10" />
      )}
      <h1 className="t-h3">{title}</h1>
      {right ?? <span className="size-10" aria-hidden />}
    </div>
  )
}

/**
 * Layout de administración. Escritorio (>= 1024px): sidebar de 248px.
 * Menos de 1024px: tab bar abajo (Metas, Aportaciones, Ajustes y Cuenta), como en el diseño móvil.
 */
export function AdminLayout() {
  const desktop = useIsAdminDesktop()
  const location = useLocation()
  if (desktop)
    return (
      <div className="flex min-h-dvh flex-col">
        <MockBanner />
        <div className="flex flex-1">
          <div className="sticky top-0 h-dvh shrink-0"><Sidebar /></div>
          <main className="ui-main"><Outlet /></main>
        </div>
      </div>
    )
  // En móvil el tab bar solo aparece en el panel; crear/editar y progreso tienen su barra de acciones.
  const showTabs = ['/admin', '/admin/aportaciones', '/admin/configuracion'].includes(location.pathname.replace(/\/$/, ''))
  return (
    <div className="min-h-dvh">
      <MockBanner />
      <div className={`mx-auto w-full max-w-[600px] ${showTabs ? 'pb-24' : ''}`}><Outlet /></div>
      {showTabs && <TabBar />}
    </div>
  )
}

function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  return () => {
    logout()
    navigate('/admin/login')
  }
}

function Sidebar() {
  const { session } = useAuth()
  const location = useLocation()
  const onLogout = useLogout()
  const name = session?.username ?? ''
  return (
    <aside className="ui-side h-full">
      <div className="px-2"><Logo to="/admin" /></div>
      <nav className="ui-nav" aria-label="Administración">
        <NavLink to="/admin" end className={({ isActive }) => (isActive || /^\/admin\/metas\//.test(location.pathname) ? 'active' : '')}>
          <GridIcon className="size-[18px]" />
          Metas
        </NavLink>
        <NavLink to="/admin/aportaciones">
          <ListIcon className="size-[18px]" />
          Aportaciones
        </NavLink>
        <NavLink to="/admin/configuracion">
          <GearIcon className="size-[18px]" />
          Configuración
        </NavLink>
      </nav>
      <div className="mt-auto flex flex-col gap-3 rounded-[14px] border border-line p-3">
        <div className="flex items-center gap-2.5">
          <span className="ui-tile size-9 !rounded-full bg-achieved-50 text-[13px] font-bold text-achieved">{initials(name || '?')}</span>
          <div className="flex min-w-0 flex-col">
            <span className="t-strong truncate">{name}</span>
            <span className="t-cap !text-ink-400">Administrador</span>
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-[13px] font-semibold text-ink-700 hover:text-ink-900">
          <LogoutIcon className="size-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

/** Tab bar móvil del admin (82px). "Cuenta" abre una hoja con el usuario y Cerrar sesión. */
function TabBar() {
  const [account, setAccount] = useState(false)
  const { session } = useAuth()
  const onLogout = useLogout()
  const tab = (active: boolean) => `flex w-20 flex-col items-center gap-1 text-[11px] font-semibold ${active ? 'text-brand-700' : 'text-ink-400'}`
  return (
    <>
      {account && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Cuenta">
          <button className="absolute inset-0 bg-ink-900/40" onClick={() => setAccount(false)} aria-label="Cerrar" />
          <div className="ui-card absolute inset-x-3 bottom-[94px] !gap-4">
            <div className="flex items-center gap-2.5">
              <span className="ui-tile size-10 !rounded-full bg-achieved-50 text-[13px] font-bold text-achieved">{initials(session?.username || '?')}</span>
              <div className="flex flex-col">
                <span className="t-strong">{session?.username}</span>
                <span className="t-cap !text-ink-400">Administrador</span>
              </div>
            </div>
            <a href="/" target="_blank" rel="noreferrer" className="ui-btn secondary sm !w-full"><EyeIcon className="size-4" /> Ver sitio público</a>
            <button onClick={onLogout} className="ui-btn danger sm !w-full"><LogoutIcon className="size-4" /> Cerrar sesión</button>
          </div>
        </div>
      )}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-[82px] justify-around border-t border-line bg-card px-2 pb-6 pt-2.5"
        style={{ boxShadow: '0 -4px 16px rgba(15,27,45,.06)' }}
        aria-label="Administración"
      >
        <NavLink to="/admin" end className={({ isActive }) => tab(isActive && !account)}>
          <GridIcon className="size-[22px]" /> Metas
        </NavLink>
        <NavLink to="/admin/aportaciones" className={({ isActive }) => tab(isActive && !account)}>
          <ListIcon className="size-[22px]" /> Aportaciones
        </NavLink>
        <NavLink to="/admin/configuracion" className={({ isActive }) => tab(isActive && !account)}>
          <GearIcon className="size-[22px]" /> Ajustes
        </NavLink>
        <button className={tab(account)} onClick={() => setAccount((v) => !v)} aria-expanded={account}>
          <UserIcon className="size-[22px]" /> Cuenta
        </button>
      </nav>
    </>
  )
}
