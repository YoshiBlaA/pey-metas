// 02 · Detalle de meta abierta  /  03 · Detalle de meta lograda (CLOSED: aviso y sin botón de aportar).
// Móvil: una columna con barra inferior. Escritorio: dos columnas con tarjeta sticky de 400px.
import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { publicApi, type GoalPublicDetail } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { useIsDesktopWidth } from '../../hooks/useMediaQuery'
import { AppBar } from '../../components/Layouts'
import { StatusBadge } from '../../components/StatusBadge'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { ContributionRow } from '../../components/ContributionRow'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { Button, ButtonLink } from '../../components/Button'
import { CheckIcon, HeartIcon, ShareIcon, ShieldIcon, TrophyIcon } from '../../components/Icons'
import { formatDayMonth } from '../../lib/format'
import { Organizer } from '../../components/Organizer'

const FIRST_MOBILE = 5
const FIRST_DESKTOP = 3

/** Compartir el enlace con la hoja nativa (celular) o copiarlo al portapapeles. */
function useShare(title?: string) {
  const [copied, setCopied] = useState(false)
  const share = () => {
    if (typeof navigator.share === 'function') void navigator.share({ title, url: window.location.href }).catch(() => {})
    else void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return { share, copied }
}

export function GoalDetailPage() {
  const id = Number(useParams().id)
  const desktop = useIsDesktopWidth()
  const { data: goal, error, loading, reload } = useAsync(() => publicApi.getGoal(id, 50), [id])

  if (loading) return <>{!desktop && <AppBar title="Detalle de la meta" backTo="/metas" />}<Spinner label="Cargando meta…" /></>
  if (error || !goal)
    return (
      <>
        {!desktop && <AppBar title="Detalle de la meta" backTo="/metas" />}
        <div className={desktop ? 'pt-8' : 'ui-content'}><ErrorAlert error={error ?? 'Meta no encontrada'} onRetry={() => void reload()} /></div>
      </>
    )
  return desktop ? <DetailDesktop goal={goal} /> : <DetailMobile goal={goal} />
}

// ---- piezas compartidas -------------------------------------------------------------
function Banner({ goal, height, icon, radius = 16 }: { goal: GoalPublicDetail; height: number; icon: number; radius?: number }) {
  const achieved = goal.status === 'CLOSED'
  return (
    <div
      className="flex flex-col justify-between rounded-[20px] p-4"
      style={{
        height,
        background: achieved
          ? 'linear-gradient(120deg,#5145CD 0%,#7C72E0 70%,#A39CF0 100%)'
          : 'linear-gradient(120deg,#0E9F6E 0%,#3CC48E 70%,#6FD9AC 100%)',
      }}
    >
      <span className="w-max rounded-full bg-white/85"><StatusBadge status={goal.status} /></span>
      <span className={`ui-tile bg-white ${achieved ? 'text-achieved' : 'text-brand-600'}`} style={{ width: icon, height: icon, borderRadius: radius }}>
        {achieved ? <TrophyIcon className="size-6" /> : <HeartIcon className="size-6" />}
      </span>
    </div>
  )
}

function Stats({ goal }: { goal: GoalPublicDetail }) {
  const achieved = goal.status === 'CLOSED'
  const remaining = Math.max(0, goal.targetAmount - goal.raisedAmount)
  return (
    <dl className="flex justify-between">
      <Stat value={`${goal.percentage}%`} label="completado" color={achieved ? 'text-achieved' : 'text-brand-700'} />
      <Stat value={String(goal.paidContributionsCount)} label="aportaciones" />
      <Stat value={<Money amount={remaining} />} label="por reunir" />
    </dl>
  )
}

function Stat({ value, label, color = '' }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div className="flex min-w-[88px] flex-col">
      <dt className="sr-only">{label}</dt>
      <dd className={`t-strong ${color}`}>{value}</dd>
      <dd className="t-cap">{label}</dd>
    </div>
  )
}

function Contributions({ goal, first, padding }: { goal: GoalPublicDetail; first: number; padding?: string }) {
  const [showAll, setShowAll] = useState(false)
  const list = showAll ? goal.recentContributions : goal.recentContributions.slice(0, first)
  return (
    <section className="ui-card" style={{ padding, gap: 14 }}>
      <div className="flex items-center justify-between">
        <h3 className="t-h3">Últimas aportaciones</h3>
        {goal.recentContributions.length > first && (
          <button className="t-strong text-brand-700" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
            {showAll ? 'Ver menos' : `Ver todas (${goal.paidContributionsCount})`}
          </button>
        )}
      </div>
      {list.length === 0 ? (
        <p className="t-body">Aún no hay aportaciones. ¡Sé la primera persona en apoyar!</p>
      ) : (
        <ul className="-my-3 divide-y divide-line">
          {list.map((c, i) => <ContributionRow key={`${c.paidAt}-${i}`} c={c} />)}
        </ul>
      )}
    </section>
  )
}

function AchievedNotice({ goal }: { goal: GoalPublicDetail }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-achieved-50 px-4 py-3.5 text-achieved" role="status">
      <TrophyIcon className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="t-strong">¡Meta lograda!</span>
        <span className="t-body !text-achieved">
          Se reunieron los <Money amount={goal.raisedAmount} /> MXN. Esta meta ya no recibe aportaciones.
        </span>
      </div>
    </div>
  )
}

/** Tarjeta morada "¡Meta lograda!" del detalle móvil (Figma 03): aviso, monto, barra y datos de cierre. */
function AchievedCardMobile({ goal }: { goal: GoalPublicDetail }) {
  const n = goal.paidContributionsCount
  // La meta se cierra con el último pago; el detalle público no trae otra fecha de cierre.
  const closedAt = goal.recentContributions[0]?.paidAt
  return (
    <section className="flex flex-col gap-4 rounded-[20px] bg-achieved-50 p-[18px]" aria-label="Meta lograda" role="status" style={{ boxShadow: '0 4px 16px rgba(81,69,205,.10)' }}>
      <div className="flex items-start gap-3">
        <span className="ui-tile size-10 shrink-0 !rounded-full bg-achieved text-white"><CheckIcon className="size-5" /></span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[19px] font-bold leading-[26px] text-achieved">¡Meta lograda!</span>
          <span className="t-body">Gracias a {n} {n === 1 ? 'persona' : 'personas'}. Esta meta ya no recibe aportaciones.</span>
        </div>
      </div>
      <div className="flex flex-col">
        <Money amount={goal.raisedAmount} className="t-xl" />
        <span className="t-body">recaudados de <Money amount={goal.targetAmount} /> MXN</span>
      </div>
      <ProgressBar value={goal.percentage} size="lg" achieved />
      <dl className="flex justify-between">
        <Stat value={`${goal.percentage}%`} label="completado" color="text-achieved" />
        <Stat value={String(n)} label="aportaciones" />
        {closedAt ? <Stat value={formatDayMonth(closedAt)} label="se cerró" /> : <span className="min-w-[88px]" />}
      </dl>
    </section>
  )
}

// ---- móvil (390×844) ------------------------------------------------------------------
/** Título del detalle en móvil: 26/34 si cabe en una línea; 22/30 si ocupa dos o más. */
function MobileTitle({ title }: { title: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [small, setSmall] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Medimos una copia invisible a 26px con el mismo ancho, para no tocar el título real.
    const measure = () => {
      const probe = el.cloneNode(true) as HTMLElement
      Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', width: `${el.clientWidth}px`, fontSize: '26px', lineHeight: '34px' })
      el.parentElement!.appendChild(probe)
      const wraps = probe.getBoundingClientRect().height > 34 * 1.5
      probe.remove()
      setSmall(wraps)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el.parentElement!)
    return () => ro.disconnect()
  }, [title])
  return (
    <h2 ref={ref} className="t-h1 -mb-1 break-words" style={small ? { fontSize: 22, lineHeight: '30px' } : { fontSize: 26, lineHeight: '34px' }}>
      {title}
    </h2>
  )
}

function DetailMobile({ goal }: { goal: GoalPublicDetail }) {
  const achieved = goal.status === 'CLOSED'
  const remaining = Math.max(0, goal.targetAmount - goal.raisedAmount)
  const { share } = useShare(goal.title)
  const shareBtn = (
    <button className="ui-iconbtn" onClick={share} aria-label="Compartir meta">
      <ShareIcon className="size-[18px]" />
    </button>
  )
  return (
    <div className="pb-28">
      <AppBar title="Detalle de la meta" backTo="/metas" right={shareBtn} />
      <div className="ui-content" style={{ gap: 16 }}>
        <Banner goal={goal} height={achieved ? 120 : 128} icon={52} radius={14} />
        <div className="flex flex-col gap-1.5">
          <MobileTitle title={goal.title} />
          <Organizer goal={goal} />
        </div>
        {achieved ? (
          <AchievedCardMobile goal={goal} />
        ) : (
          <section className="ui-card" aria-label="Progreso">
            <div className="flex flex-col">
              <Money amount={goal.raisedAmount} className="t-xl" />
              <span className="t-bodyL" style={{ fontSize: 15, lineHeight: '24px' }}>recaudados de <Money amount={goal.targetAmount} /> MXN</span>
            </div>
            <ProgressBar value={goal.percentage} size="lg" achieved={achieved} />
            <Stats goal={goal} />
          </section>
        )}
        {goal.description && (
          <section className="flex flex-col gap-1.5">
            <h3 className="t-h3">Sobre esta meta</h3>
            <p className="t-body whitespace-pre-line">{goal.description}</p>
          </section>
        )}
        <Contributions goal={goal} first={FIRST_MOBILE} />
      </div>

      <div className="ui-bottombar">
        <div className="mx-auto flex w-full max-w-[440px] items-center gap-4">
          {achieved ? (
            <ButtonLink to="/metas" variant="secondary">Ver otras metas</ButtonLink>
          ) : (
            <>
              <div className="flex shrink-0 flex-col">
                <span className="t-cap">Faltan</span>
                <Money amount={remaining} className="t-h3" style={{ fontSize: 18, fontWeight: 600 }} />
              </div>
              <ButtonLink to={`/metas/${goal.id}/aportar`}>Aportar</ButtonLink>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- escritorio (1440×900) ------------------------------------------------------------
function DetailDesktop({ goal }: { goal: GoalPublicDetail }) {
  const achieved = goal.status === 'CLOSED'
  const { share, copied } = useShare(goal.title)
  const short = (n: number) => (Number.isInteger(n) ? `$${n.toLocaleString('es-MX')}` : `$${n.toFixed(2)}`)
  return (
    <div className="flex flex-col gap-5 pt-6">
      <nav className="t-crumb" aria-label="Ruta">
        <Link to="/metas" className="hover:text-ink-700">Metas</Link><span className="mx-1.5">/</span><span>{goal.title}</span>
      </nav>
      <div className="flex items-start gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <Banner goal={goal} height={150} icon={56} />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[34px] font-extrabold leading-[42px]">{goal.title}</h1>
            <Organizer goal={goal} />
          </div>
          {goal.description && (
            <section className="flex flex-col gap-1.5">
              <h2 className="t-h3">Sobre esta meta</h2>
              <p className="t-body whitespace-pre-line" style={{ fontSize: 15, lineHeight: '23px' }}>{goal.description}</p>
            </section>
          )}
          <Contributions goal={goal} first={FIRST_DESKTOP} padding="18px 20px" />
        </div>

        <aside className="ui-card sticky top-6 w-[400px] shrink-0" style={{ padding: 24, gap: 18 }} aria-label="Progreso">
          <div className="flex flex-col">
            <Money amount={goal.raisedAmount} className="text-[40px] font-extrabold leading-[48px]" />
            <span className="t-bodyL">recaudados de <Money amount={goal.targetAmount} /> MXN</span>
          </div>
          <ProgressBar value={goal.percentage} size="lg" achieved={achieved} />
          <Stats goal={goal} />
          <div className="h-px bg-line" />
          {achieved ? (
            <>
              <AchievedNotice goal={goal} />
              <Button variant="secondary" onClick={share}><ShareIcon className="size-[18px]" /> {copied ? 'Enlace copiado' : 'Compartir meta'}</Button>
              <ButtonLink to="/metas" variant="ghost">Ver otras metas abiertas</ButtonLink>
            </>
          ) : (
            <>
              {goal.presetAmounts.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  <span className="t-strong">Montos sugeridos</span>
                  <div className="ui-amounts">
                    {goal.presetAmounts.map((p) => (
                      <Link key={p} to={`/metas/${goal.id}/aportar`} state={{ amount: p }} className="ui-amt !h-12 !text-[16px] hover:bg-brand-50">
                        {short(p)}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <ButtonLink to={`/metas/${goal.id}/aportar`}>Aportar</ButtonLink>
              <Button variant="secondary" onClick={share}><ShareIcon className="size-[18px]" /> {copied ? 'Enlace copiado' : 'Compartir meta'}</Button>
              <p className="t-cap flex items-center justify-center gap-1.5 !text-ink-400">
                <ShieldIcon className="size-3.5" /> Pago seguro con QR de CoDi vía Pey
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
