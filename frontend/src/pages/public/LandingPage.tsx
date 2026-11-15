// Landing pública (/): qué es Pey Metas, metas destacadas y llamada a crear cuenta. La ve todo el mundo.
// No hay diseño en Figma. Usa las paletas de acento de lib/palettes (Colorbears) con el estilo de
// "bandas apiladas"; los botones y estados siguen con el verde de la marca en el resto del sitio.
import type { CSSProperties, ReactNode } from 'react'
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
import { ARCTIC_SKY, IONIZED_CYAN, SAGE_STATIC, STATIC_AMETHYST as AM, THERMAL_GLAZE, accent, type Palette } from '../../lib/palettes'

const STEPS: { icon: typeof HeartIcon; title: string; text: string; p: Palette }[] = [
  { icon: HeartIcon, title: 'Crea tu meta', text: 'Título, monto objetivo y montos sugeridos. Un minuto.', p: THERMAL_GLAZE },
  { icon: QrIcon, title: 'Comparte el enlace', text: 'Quien apoya elige un monto y genera su QR de CoDi.', p: ARCTIC_SKY },
  { icon: PhoneIcon, title: 'Pagan desde su banco', text: 'El pago llega vía Pey y la barra avanza sola.', p: IONIZED_CYAN },
  { icon: TrophyIcon, title: '¡Meta lograda!', text: 'Al llegar al 100 % la meta se cierra sola.', p: SAGE_STATIC },
]

/** Pequeña etiqueta de sección con el color de una paleta. */
function Eyebrow({ p, children }: { p: Palette; children: ReactNode }) {
  return (
    <span className="w-max rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-[.08em]" style={{ background: p.c50, color: p.c900 }}>
      {children}
    </span>
  )
}

/** Las 4 bandas apiladas del hero: una por paso, cada una con su paleta y el canto oscuro abajo. */
function StepStack({ compact }: { compact: boolean }) {
  return (
    <ol className="flex flex-col" aria-label="Cómo funciona">
      {STEPS.map((s, i) => (
        <li
          key={s.title}
          className="lp-stack relative flex items-center gap-3.5"
          style={{
            background: s.p.c700,
            boxShadow: `0 ${compact ? 6 : 8}px 0 ${s.p.edge}`,
            padding: compact ? '14px 16px' : '18px 22px',
            marginTop: i ? (compact ? 4 : 6) : 0,
            zIndex: STEPS.length - i,
          }}
        >
          <span className="ui-tile shrink-0 bg-white" style={{ width: compact ? 38 : 44, height: compact ? 38 : 44, color: s.p.c900, borderRadius: 12 }}>
            <s.icon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-white/80">Paso {i + 1}</span>
            <span className={`${compact ? 'text-[16px]' : 'text-[18px]'} font-extrabold leading-tight text-white`}>{s.title}</span>
            {!compact && <span className="text-[13px] leading-5 text-white/90">{s.text}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** Tarjeta de cifra con el estilo apilado. */
function StatTile({ p, value, label }: { p: Palette; value: string; label: string }) {
  return (
    <div className="lp-stack flex-1 px-4 py-3" style={{ background: p.c50, boxShadow: `0 5px 0 ${p.c500}`, borderRadius: 18 }}>
      <div className="text-[22px] font-extrabold tabular-nums leading-8" style={{ color: p.c900 }}>{value}</div>
      <div className="text-[12px] font-semibold" style={{ color: p.c900, opacity: 0.8 }}>{label}</div>
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

  const ctas = (
    <div className={`flex gap-3 ${desktop ? '' : 'flex-col'}`}>
      <Link to="/metas" className={`ui-btn ${desktop ? '!w-48' : ''} !bg-white`} style={{ color: AM.c900, boxShadow: `0 5px 0 ${AM.c200}` }}>
        Ver metas
      </Link>
      <Link to={createTo} className={`ui-btn ${desktop ? '!w-56' : ''} !text-white`} style={{ background: THERMAL_GLAZE.c700, boxShadow: `0 5px 0 ${THERMAL_GLAZE.edge}` }}>
        {isAuthenticated ? 'Ir a mi panel' : 'Crea tu meta gratis'}
      </Link>
    </div>
  )
  const stats = (
    <div className="flex gap-3">
      <StatTile p={IONIZED_CYAN} value={raised !== undefined ? formatMoney(raised) : '—'} label="recaudados" />
      <StatTile p={THERMAL_GLAZE} value={goals ? String(open.length) : '—'} label="metas abiertas" />
      {desktop && <StatTile p={SAGE_STATIC} value={achieved !== undefined ? String(achieved) : '—'} label="logradas" />}
    </div>
  )

  const heroStyle: CSSProperties = { background: `linear-gradient(135deg, ${AM.c900} 0%, ${AM.c700} 55%, ${AM.c500} 100%)` }
  const hero = (
    <section className={`relative overflow-hidden text-white ${desktop ? 'mt-6 rounded-[32px] px-14 py-14' : 'px-5 pb-9 pt-2'}`} style={heroStyle}>
      {/* Manchas de color que flotan detrás del contenido. */}
      <span className="lp-blob" style={{ background: THERMAL_GLAZE.c500, width: 320, height: 320, top: -90, right: desktop ? 260 : -120 }} aria-hidden />
      <span className="lp-blob" style={{ background: IONIZED_CYAN.c700, width: 280, height: 280, bottom: -120, left: -80, animationDelay: '-5s' }} aria-hidden />
      <span className="lp-blob" style={{ background: ARCTIC_SKY.c500, width: 220, height: 220, bottom: 40, right: -60, animationDelay: '-9s' }} aria-hidden />

      <div className={`relative ${desktop ? 'grid grid-cols-[1.15fr_1fr] items-center gap-14' : 'flex flex-col gap-6'}`}>
        <div className="flex flex-col gap-6">
          {!desktop && (
            <div className="flex h-14 items-center justify-between">
              <span className="[&_span]:!text-white"><Logo /></span>
              <Link to={isAuthenticated ? '/admin' : '/admin/login'} className="text-[14px] font-semibold text-white">
                {isAuthenticated ? 'Mi panel' : 'Iniciar sesión'}
              </Link>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <h1 className={desktop ? 'text-[52px] font-extrabold leading-[58px]' : 'text-[32px] font-extrabold leading-[39px]'}>
              Junta dinero para{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${THERMAL_GLAZE.c50}, ${THERMAL_GLAZE.c500})` }}>
                lo que importa
              </span>
              , con CoDi.
            </h1>
            <p className={desktop ? 'text-[18px] leading-7' : 'text-[15px] leading-6'} style={{ color: AM.c50 }}>
              Crea una meta, compártela y recibe aportaciones desde la app de cualquier banco. Sin comisiones y con una barra de progreso que todos pueden ver.
            </p>
          </div>
          {ctas}
          <div className={desktop ? 'max-w-[560px] pt-2' : 'pt-1'}>{stats}</div>
        </div>
        <div className="flex flex-col gap-3">
          <StepStack compact={!desktop} />
          <Link to="/como-funciona" className="mt-3 w-max text-[14px] font-semibold text-white/90 underline-offset-4 hover:underline">
            Más detalles de cómo funciona →
          </Link>
        </div>
      </div>
    </section>
  )

  const featuredSection = (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Eyebrow p={IONIZED_CYAN}>Metas abiertas</Eyebrow>
          <h2 className={desktop ? 't-h1' : 't-h2'}>Metas para apoyar</h2>
        </div>
        <Link to="/metas" className="t-strong hover:underline" style={{ color: AM.c700 }}>Ver todas →</Link>
      </div>
      {loading ? (
        <Spinner label="Cargando metas…" />
      ) : featured.length === 0 ? (
        <p className="ui-card t-body text-center">Todavía no hay metas. ¡Crea la primera!</p>
      ) : (
        <div className={`grid ${desktop ? 'grid-cols-3 gap-6' : 'gap-5'}`}>
          {featured.map((g, i) => {
            const p = accent(i)
            // Cada meta destacada lleva una banda de color arriba y el canto apilado abajo.
            return (
              <div key={g.id} className="lp-stack overflow-hidden !rounded-[18px] pt-2" style={{ background: p.c900, boxShadow: `0 6px 0 ${p.edge}` }}>
                <GoalCard goal={g} count={counts[g.id]} large padding={desktop ? undefined : 16} />
              </div>
            )
          })}
        </div>
      )}
    </section>
  )

  const closing = (
    <section
      className={`relative flex flex-col items-center overflow-hidden text-center text-white ${desktop ? 'rounded-[32px] px-10 py-14' : 'rounded-[24px] px-6 py-9'}`}
      style={{ background: `linear-gradient(135deg, ${THERMAL_GLAZE.c900} 0%, ${THERMAL_GLAZE.c700} 50%, ${THERMAL_GLAZE.c500} 100%)`, gap: 14 }}
    >
      <span className="lp-blob" style={{ background: THERMAL_GLAZE.c50, width: 240, height: 240, top: -110, left: -60, opacity: 0.35 }} aria-hidden />
      <span className="lp-blob" style={{ background: AM.c500, width: 260, height: 260, bottom: -140, right: -40, opacity: 0.45, animationDelay: '-6s' }} aria-hidden />
      <span className="ui-tile relative size-12 bg-white" style={{ color: THERMAL_GLAZE.c900 }}><ShieldIcon className="size-6" /></span>
      <h2 className={`relative font-extrabold ${desktop ? 'text-[34px] leading-[42px]' : 'text-[24px] leading-[31px]'}`}>¿Tienes una causa? Crea tu meta</h2>
      <p className="relative max-w-[540px] text-[15px] leading-6" style={{ color: THERMAL_GLAZE.c50 }}>
        Cada cuenta maneja sus propias metas y ve sus aportaciones en tiempo real. Los pagos se cobran con QR de CoDi vía Pey.
      </p>
      <Link to={createTo} className={`ui-btn relative !bg-white ${desktop ? '!w-56' : ''}`} style={{ color: THERMAL_GLAZE.c900, boxShadow: `0 5px 0 ${THERMAL_GLAZE.edge}` }}>
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
            <Link to="/como-funciona" className="font-semibold" style={{ color: AM.c700 }}>¿Cómo funciona?</Link>
            <span aria-hidden>·</span>
            <Link to="/preguntas-frecuentes" className="font-semibold" style={{ color: AM.c700 }}>Preguntas frecuentes</Link>
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
