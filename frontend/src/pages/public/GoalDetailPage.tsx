// 02 · Detalle de meta abierta  /  03 · Detalle de meta lograda (CLOSED: aviso y sin botón de aportar).
// Móvil: una columna con barra inferior. Escritorio: dos columnas con tarjeta sticky de 400px.
import { useState } from 'react'
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
import { HeartIcon, ShareIcon, ShieldIcon, TrophyIcon } from '../../components/Icons'

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

  if (loading) return <>{!desktop && <AppBar title="Detalle de la meta" backTo="/" />}<Spinner label="Cargando meta…" /></>
  if (error || !goal)
    return (
      <>
        {!desktop && <AppBar title="Detalle de la meta" backTo="/" />}
        <div className={desktop ? 'pt-8' : 'ui-content'}><ErrorAlert error={error ?? 'Meta no encontrada'} onRetry={() => void reload()} /></div>
      </>
    )
  return desktop ? <DetailDesktop goal={goal} /> : <DetailMobile goal={goal} />
}

// ---- piezas compartidas -------------------------------------------------------------
function Banner({ goal, height, icon }: { goal: GoalPublicDetail; height: number; icon: number }) {
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
      <span className={`ui-tile bg-white ${achieved ? 'text-achieved' : 'text-brand-600'}`} style={{ width: icon, height: icon, borderRadius: 16 }}>
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

// ---- móvil (390×844) ------------------------------------------------------------------
function DetailMobile({ goal }: { goal: GoalPublicDetail }) {
  const achieved = goal.status === 'CLOSED'
  const remaining = Math.max(0, goal.targetAmount - goal.raisedAmount)
  const { share, copied } = useShare(goal.title)
  const shareBtn = (
    <button className="ui-iconbtn" onClick={share} aria-label="Compartir meta">
      <ShareIcon className="size-[18px]" />
    </button>
  )
  return (
    <div className="pb-28">
      <AppBar title="Detalle de la meta" backTo="/" right={shareBtn} />
      <div className="ui-content">
        <Banner goal={goal} height={110} icon={44} />
        <h2 className="t-h1 -mb-2">{goal.title}</h2>
        {achieved && <AchievedNotice goal={goal} />}
        <section className="ui-card" aria-label="Progreso">
          <div className="flex flex-col">
            <Money amount={goal.raisedAmount} className="t-xl" />
            <span className="t-body">recaudados de <Money amount={goal.targetAmount} /> MXN</span>
          </div>
          <ProgressBar value={goal.percentage} size="lg" achieved={achieved} />
          <Stats goal={goal} />
        </section>
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
            <Button variant="secondary" onClick={share}><ShareIcon className="size-[18px]" /> {copied ? 'Enlace copiado' : 'Compartir meta'}</Button>
          ) : (
            <>
              <div className="flex shrink-0 flex-col">
                <span className="t-cap">Faltan</span>
                <Money amount={remaining} className="t-h3 !font-bold" />
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
        <Link to="/" className="hover:text-ink-700">Metas</Link><span className="mx-1.5">/</span><span>{goal.title}</span>
      </nav>
      <div className="flex items-start gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <Banner goal={goal} height={150} icon={56} />
          <h1 className="text-[34px] font-extrabold leading-[42px]">{goal.title}</h1>
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
              <ButtonLink to="/" variant="ghost">Ver otras metas abiertas</ButtonLink>
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
