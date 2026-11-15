import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { USE_MOCKS } from '../api'
import { useAuth } from '../auth/AuthContext'
import { buttonClass } from './Button'

/** Logo de la marca. */
export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2" aria-label="Pey Metas, inicio">
      <span className="grid size-9 place-items-center rounded-lg bg-brand-600 text-lg font-bold text-white">P</span>
      <span className="text-xl font-bold">
        Pey <span className="font-medium text-brand-600">Metas</span>
      </span>
    </Link>
  )
}

/** Aviso visible cuando la app corre con datos de prueba. */
function MockBanner() {
  if (!USE_MOCKS) return null
  return (
    <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
      Modo demo: datos de prueba (VITE_USE_MOCKS=true)
    </div>
  )
}

/** Layout público: pensado para móvil (columna angosta centrada). */
export function PublicLayout() {
  return (
    <div className="min-h-dvh">
      <MockBanner />
      <div className="mx-auto max-w-md px-4 pb-10">
        <Outlet />
      </div>
    </div>
  )
}

/** Layout de administración: pensado para escritorio, con barra superior. */
export function AdminLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const navCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-closed'}`
  return (
    <div className="min-h-dvh">
      <MockBanner />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Logo to="/admin" />
            <nav className="flex gap-1" aria-label="Administración">
              <NavLink to="/admin" end className={navCls}>Metas</NavLink>
              <NavLink to="/admin/metas/nueva" className={navCls}>Nueva meta</NavLink>
              <NavLink to="/" className={navCls}>Ver sitio público</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-ink-500">
            <span>{session?.username}</span>
            <button
              className={buttonClass('secondary', 'sm')}
              onClick={() => {
                logout()
                navigate('/admin/login')
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}

/** Encabezado de pantallas internas en móvil: botón atrás + título centrado. */
export function TopBar({ title, backTo }: { title: string; backTo: string }) {
  return (
    <div className="relative flex items-center justify-center py-4">
      <Link
        to={backTo}
        className="absolute left-0 grid size-10 place-items-center rounded-full border border-line bg-white"
        aria-label="Regresar"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-5" aria-hidden>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  )
}
