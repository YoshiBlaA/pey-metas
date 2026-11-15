// Landing pública (/): qué es Pey Metas, metas destacadas y llamada a crear cuenta. La ve todo el mundo.
// No hay diseño en Figma: usa las piezas del sitio (gradiente verde del login, tarjetas de meta, botones).
import { Link } from 'react-router-dom'
import { publicApi } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { useIsDesktopWidth } from '../../hooks/useMediaQuery'
import { useGoalCounts } from '../../hooks/useGoalCounts'
import { useAuth } from '../../auth/AuthContext'
import { Logo } from '../../components/Layouts'
import { GoalCard } from '../../components/GoalCard'
import { Spinner } from '../../components/Spinner'
import { HeartIcon, PhoneIcon, QrIcon, ShieldIcon, TrophyIcon } from '../../components/Icons'
import { formatMoney } from '../../lib/format'

const GRADIENT = 'linear-gradient(150deg,#057A55 0%,#0E9F6E 55%,#3CC48E 100%)'

const STEPS = [
  { icon: HeartIcon, title: 'Crea tu meta', text: 'Ponle título, monto objetivo y montos sugeridos. Toma un minuto.' },
  { icon: QrIcon, title: 'Comparte el enlace', text: 'Quien quiera apoyar elige un monto y genera su QR de CoDi.' },
  { icon: PhoneIcon, title: 'Pagan desde su banco', text: 'El pago llega directo vía Pey; la barra avanza sola.' },
  { icon: TrophyIcon, title: 'Meta lograda', text: 'Al llegar al 100 % la meta se cierra y deja de recibir pagos.' },
]

export function LandingPage() {
  const desktop = useIsDesktopWidth()
  const { isAuthenticated } = useAuth()
  const { data: goals, loading } = useAsync(() => publicApi.listGoals(), [])
  const counts = useGoalCounts(goals)
  const open = (goals ?? []).filter((g) => g.status === 'OPEN')
  const featured = (open.length ? open : goals ?? []).slice(0, desktop ? 3 : 2)
  const raised = goals?.reduce((s, g) => s + g.raisedAmount, 0)
  const achieved = goals?.filter((g) => g.status === 'CLOSED').length

  const ctas = (
    <div className={`flex gap-3 ${desktop ? '' : 'flex-col'}`}>
      <Link to="/metas" className={`ui-btn ${desktop ? '!w-48' : ''} !bg-white !text-brand-700`}>Ver metas</Link>
      <Link to={isAuthenticated ? '/admin' : '/admin/registro'} className={`ui-btn ${desktop ? '!w-56' : ''} !border !border-white/60 !bg-white/10 !text-white`}>
        {isAuthenticated ? 'Ir a mi panel' : 'Crea tu meta gratis'}
      </Link>
    </div>
  )
  const stats = (
    <div className="flex gap-3">
      <div className="flex-1 rounded-2xl bg-white/15 p-4">
        <div className="text-2xl font-extrabold tabular-nums">{raised !== undefined ? formatMoney(raised) : '—'}</div>
        <div className="text-xs font-medium text-[#D7F5E8]">recaudados en total</div>
      </div>
      <div className="flex-1 rounded-2xl bg-white/15 p-4">
        <div className="text-2xl font-extrabold tabular-nums">{achieved ?? '—'}</div>
        <div className="text-xs font-medium text-[#D7F5E8]">metas logradas</div>
      </div>
    </div>
  )

  const hero = (
    <section
      className={`flex flex-col text-white ${desktop ? 'mt-6 gap-6 rounded-[28px] p-14' : 'gap-5 px-5 pb-7 pt-2'}`}
      style={{ background: GRADIENT }}
    >
      {!desktop && (
        <div className="flex h-14 items-center justify-between">
          <span className="[&_span]:!text-white"><Logo /></span>
          <Link to={isAuthenticated ? '/admin' : '/admin/login'} className="text-[14px] font-semibold text-white">
            {isAuthenticated ? 'Mi panel' : 'Iniciar sesión'}
          </Link>
        </div>
      )}
      <div className={`flex flex-col gap-3 ${desktop ? 'max-w-[720px]' : ''}`}>
        <h1 className={desktop ? 'text-[48px] font-extrabold leading-[56px]' : 'text-[30px] font-extrabold leading-[38px]'}>
          Junta dinero para lo que importa, con CoDi.
        </h1>
        <p className={`${desktop ? 'text-[18px] leading-7' : 'text-[15px] leading-6'} text-[#D7F5E8]`}>
          Crea una meta, compártela y recibe aportaciones desde la app de cualquier banco. Sin comisiones y con una barra de progreso que todos pueden ver.
        </p>
      </div>
      {ctas}
      <div className={desktop ? 'max-w-[480px]' : ''}>{stats}</div>
    </section>
  )

  const steps = (
    <section className="flex flex-col gap-4">
      <h2 className={desktop ? 't-h1' : 't-h2'}>¿Cómo funciona?</h2>
      <ol className={`grid gap-3.5 ${desktop ? 'grid-cols-4 gap-5' : ''}`}>
        {STEPS.map((s, i) => (
          <li key={s.title} className="ui-card" style={{ gap: 10 }}>
            <span className="ui-tile size-11 bg-brand-50 text-brand-700"><s.icon className="size-5" /></span>
            <span className="t-cap !font-semibold !text-brand-700">Paso {i + 1}</span>
            <h3 className="t-h3">{s.title}</h3>
            <p className="t-body">{s.text}</p>
          </li>
        ))}
      </ol>
      <Link to="/como-funciona" className="t-strong text-brand-700 hover:underline">Más detalles →</Link>
    </section>
  )

  const featuredSection = (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className={desktop ? 't-h1' : 't-h2'}>Metas para apoyar</h2>
        <Link to="/metas" className="t-strong text-brand-700 hover:underline">Ver todas</Link>
      </div>
      {loading ? (
        <Spinner label="Cargando metas…" />
      ) : featured.length === 0 ? (
        <p className="ui-card t-body text-center">Todavía no hay metas. ¡Crea la primera!</p>
      ) : (
        <div className={`grid gap-3.5 ${desktop ? 'grid-cols-3 gap-6' : ''}`}>
          {featured.map((g) => <GoalCard key={g.id} goal={g} count={counts[g.id]} large padding={desktop ? undefined : 16} />)}
        </div>
      )}
    </section>
  )

  const closing = (
    <section className="ui-card items-center text-center" style={{ padding: desktop ? 40 : 24, gap: 12 }}>
      <ShieldIcon className="size-7 text-brand-700" />
      <h2 className="t-h2">¿Tienes una causa? Crea tu meta</h2>
      <p className="t-body max-w-[520px]">Cada cuenta maneja sus propias metas y ve sus aportaciones en tiempo real. Los pagos se cobran con QR de CoDi vía Pey.</p>
      <Link to={isAuthenticated ? '/admin' : '/admin/registro'} className={`ui-btn ${desktop ? '!w-56' : ''}`}>
        {isAuthenticated ? 'Ir a mi panel' : 'Crear cuenta gratis'}
      </Link>
    </section>
  )

  if (!desktop)
    return (
      <div className="pb-10">
        {hero}
        <div className="ui-content" style={{ gap: 24, paddingTop: 20 }}>
          {featuredSection}
          {steps}
          {closing}
          <nav className="t-cap flex justify-center gap-2 !text-ink-400" aria-label="Ayuda">
            <Link to="/preguntas-frecuentes" className="font-semibold text-brand-700">Preguntas frecuentes</Link>
          </nav>
        </div>
      </div>
    )
  return (
    <div className="flex flex-col gap-12">
      {hero}
      {featuredSection}
      {steps}
      {closing}
    </div>
  )
}
