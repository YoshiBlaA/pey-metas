// Landing pública (/): qué es Pey Metas, metas destacadas y llamada a crear cuenta. La ve todo el mundo.
// No hay diseño en Figma. Dos colores: verde de la marca para las acciones y Static Amethyst (Colorbears)
// como acento; los pasos usan las "bandas apiladas" de esa paleta, de oscuro a claro.
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

// Bandas de la paleta Static Amethyst, de la más oscura a la más clara (texto blanco u oscuro según el fondo).
const STEPS = [
  { icon: HeartIcon, title: 'Crea tu meta', text: 'Título, monto objetivo y montos sugeridos.', bg: '#3D36B4', edge: '#1715A3', fg: '#fff', sub: '#D7C0F9' },
  { icon: QrIcon, title: 'Comparte el enlace', text: 'Quien apoya elige un monto y genera su QR.', bg: '#7266CC', edge: '#3D36B4', fg: '#fff', sub: '#F3EFFE' },
  { icon: PhoneIcon, title: 'Pagan desde su banco', text: 'Con CoDi vía Pey; la barra avanza sola.', bg: '#B6A3EB', edge: '#7266CC', fg: '#1715A3', sub: '#3D36B4' },
  { icon: TrophyIcon, title: '¡Meta lograda!', text: 'Al llegar al 100 % la meta se cierra.', bg: '#D7C0F9', edge: '#B6A3EB', fg: '#1715A3', sub: '#3D36B4' },
]

function StepStack({ compact }: { compact: boolean }) {
  return (
    <ol className="flex flex-col" aria-label="Cómo funciona">
      {STEPS.map((s, i) => (
        <li
          key={s.title}
          className="lp-stack relative flex items-center gap-3.5"
          style={{
            background: s.bg,
            boxShadow: `0 ${compact ? 5 : 7}px 0 ${s.edge}`,
            padding: compact ? '13px 16px' : '17px 22px',
            marginTop: i ? (compact ? 3 : 5) : 0,
            zIndex: STEPS.length - i,
          }}
        >
          <span className="ui-tile shrink-0 bg-white/90 text-accent-700" style={{ width: compact ? 36 : 42, height: compact ? 36 : 42 }}>
            <s.icon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] font-bold uppercase tracking-[.08em]" style={{ color: s.sub }}>Paso {i + 1}</span>
            <span className={`${compact ? 'text-[15px]' : 'text-[17px]'} font-bold leading-tight`} style={{ color: s.fg }}>{s.title}</span>
            {!compact && <span className="text-[13px] leading-5" style={{ color: s.sub }}>{s.text}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`text-[24px] font-extrabold tabular-nums leading-8 ${accent ? 'text-accent-700' : 'text-brand-700'}`}>{value}</span>
      <span className="t-cap">{label}</span>
    </div>
  )
}

export function LandingPage() {
  const desktop = useIsDesktopWidth()
  const { isAuthenticated } = useAuth()
  const { data: goals, loading } = useAsync(() => publicApi.listGoals(), [])
  const counts = useGoalCounts(goals)
  const open = (goals ?? []).filter((g) => g.status === 'OPEN')
  const featured = (open.length ? open : goals ?? []).slice(0, desktop ? 3 : 2)
  const raised = goals?.reduce((s, g) => s + g.raisedAmount, 0)
  const achieved = goals?.filter((g) => g.status === 'CLOSED').length
  const createTo = isAuthenticated ? '/admin' : '/admin/registro'

  const hero = (
    <section
      className={`relative overflow-hidden ${desktop ? 'mt-6 rounded-[32px] border border-line px-14 py-14' : 'px-5 pb-8 pt-2'}`}
      style={{ background: 'linear-gradient(135deg, #ffffff 0%, var(--color-brand-50) 45%, var(--color-accent-50) 100%)' }}
    >
      <span className="lp-blob" style={{ background: 'var(--color-accent-200)', width: 300, height: 300, top: -120, right: desktop ? 120 : -140 }} aria-hidden />
      <span className="lp-blob" style={{ background: 'var(--color-brand-200)', width: 260, height: 260, bottom: -140, left: -90, animationDelay: '-7s' }} aria-hidden />

      <div className={`relative ${desktop ? 'grid grid-cols-[1.2fr_1fr] items-center gap-14' : 'flex flex-col gap-6'}`}>
        <div className="flex flex-col gap-6">
          {!desktop && (
            <div className="flex h-14 items-center justify-between">
              <Logo />
              <Link to={isAuthenticated ? '/admin' : '/admin/login'} className="text-[14px] font-semibold text-accent-700">
                {isAuthenticated ? 'Mi panel' : 'Iniciar sesión'}
              </Link>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <span className="w-max rounded-full bg-accent-50 px-3 py-1 text-[12px] font-bold text-accent-700 ring-1 ring-accent-100">
              Aportaciones con CoDi, sin comisiones
            </span>
            <h1 className={desktop ? 'text-[48px] font-extrabold leading-[56px]' : 'text-[30px] font-extrabold leading-[38px]'}>
              Junta dinero para <span className="lp-grad-text">lo que importa</span>.
            </h1>
            <p className={desktop ? 't-bodyL max-w-[540px]' : 't-body'} style={desktop ? undefined : { fontSize: 15, lineHeight: '24px' }}>
              Crea una meta, compártela y recibe aportaciones desde la app de cualquier banco, con una barra de progreso que todos pueden ver.
            </p>
          </div>
          <div className={`flex gap-3 ${desktop ? '' : 'flex-col'}`}>
            <Link to={createTo} className={`ui-btn primary ${desktop ? '!w-56' : ''}`}>{isAuthenticated ? 'Ir a mi panel' : 'Crea tu meta gratis'}</Link>
            <Link to="/metas" className={`ui-btn secondary ${desktop ? '!w-44' : ''}`}>Ver metas</Link>
          </div>
          <div className="flex gap-8 pt-1">
            <Stat value={raised !== undefined ? formatMoney(raised) : '—'} label="recaudados" />
            <Stat value={goals ? String(open.length) : '—'} label="metas abiertas" />
            <Stat value={achieved !== undefined ? String(achieved) : '—'} label="logradas" accent />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <StepStack compact={!desktop} />
          <Link to="/como-funciona" className="mt-3 w-max text-[14px] font-semibold text-accent-700 hover:underline">
            Más detalles de cómo funciona →
          </Link>
        </div>
      </div>
    </section>
  )

  const featuredSection = (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <h2 className={desktop ? 't-h1' : 't-h2'}>Metas para apoyar</h2>
        <Link to="/metas" className="t-strong text-brand-700 hover:underline">Ver todas →</Link>
      </div>
      {loading ? (
        <Spinner label="Cargando metas…" />
      ) : featured.length === 0 ? (
        <p className="ui-card t-body text-center">Todavía no hay metas. ¡Crea la primera!</p>
      ) : (
        <div className={`grid ${desktop ? 'grid-cols-3 gap-6' : 'gap-3.5'}`}>
          {featured.map((g) => <GoalCard key={g.id} goal={g} count={counts[g.id]} large padding={desktop ? undefined : 16} />)}
        </div>
      )}
    </section>
  )

  const closing = (
    <section
      className={`relative flex flex-col items-center overflow-hidden text-center text-white ${desktop ? 'rounded-[32px] px-10 py-14' : 'rounded-[24px] px-6 py-9'}`}
      style={{ background: 'linear-gradient(135deg, var(--color-accent-900) 0%, var(--color-accent-700) 60%, var(--color-accent-500) 100%)', gap: 14 }}
    >
      <span className="lp-blob" style={{ background: 'var(--color-brand-400)', width: 240, height: 240, bottom: -150, left: -60, opacity: 0.35 }} aria-hidden />
      <span className="ui-tile relative size-12 bg-white/15 text-white"><ShieldIcon className="size-6" /></span>
      <h2 className={`relative font-extrabold ${desktop ? 'text-[32px] leading-[40px]' : 'text-[24px] leading-[31px]'}`}>¿Tienes una causa? Crea tu meta</h2>
      <p className="relative max-w-[540px] text-[15px] leading-6 text-accent-100">
        Cada cuenta maneja sus propias metas y ve sus aportaciones en tiempo real. Los pagos se cobran con QR de CoDi vía Pey.
      </p>
      <Link to={createTo} className={`ui-btn primary relative ${desktop ? '!w-56' : ''}`}>
        {isAuthenticated ? 'Ir a mi panel' : 'Crear cuenta gratis'}
      </Link>
    </section>
  )

  if (!desktop)
    return (
      <div className="pb-10">
        {hero}
        <div className="ui-content" style={{ gap: 28, paddingTop: 24 }}>
          {featuredSection}
          {closing}
          <nav className="t-cap flex justify-center gap-2 !text-ink-400" aria-label="Ayuda">
            <Link to="/como-funciona" className="font-semibold text-accent-700">¿Cómo funciona?</Link>
            <span aria-hidden>·</span>
            <Link to="/preguntas-frecuentes" className="font-semibold text-accent-700">Preguntas frecuentes</Link>
          </nav>
        </div>
      </div>
    )
  return (
    <div className="flex flex-col gap-14">
      {hero}
      {featuredSection}
      {closing}
    </div>
  )
}
