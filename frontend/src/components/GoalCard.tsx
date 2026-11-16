import { Link } from 'react-router-dom'
import type { GoalPublicSummary } from '../api'
import { Money } from './Money'
import { ProgressBar } from './ProgressBar'
import { StatusBadge } from './StatusBadge'
import { HeartIcon, TrophyIcon, UsersIcon } from './Icons'

/** Tarjeta de una meta (01 Lista). Toda la tarjeta es un enlace al detalle. */
interface CardProps {
  goal: Pick<GoalPublicSummary, 'id' | 'title' | 'status' | 'raisedAmount' | 'targetAmount' | 'percentage'>
  asLink?: boolean
  /** Aportaciones pagadas (si se conocen). */
  count?: number | null
  /** Variante de escritorio: padding 18, ícono 48px, título 18px, monto 22px. */
  large?: boolean
  /** Padding de la tarjeta (por defecto 18 en large; el móvil usa large con 16). */
  padding?: number
  /** Contenido extra al final de la tarjeta (p. ej. montos en la vista previa). */
  extra?: React.ReactNode
}

export function GoalCard({ goal, asLink = true, count, large = false, padding, extra }: CardProps) {
  const achieved = goal.status === 'CLOSED'
  const body = (
    <>
      <div className="flex items-start" style={{ gap: large ? 14 : 12 }}>
        <GoalIcon achieved={achieved} size={large ? 48 : 44} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 className="t-h3 break-words" style={large ? { fontSize: 18 } : undefined}>{goal.title || 'Sin título'}</h2>
          <StatusBadge status={goal.status} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col">
          <Money amount={goal.raisedAmount} className="t-h2" style={large ? { fontSize: 22 } : undefined} />
          <span className="t-cap">
            de <Money amount={goal.targetAmount} /> MXN
          </span>
        </div>
        <span className={`t-h3 ${achieved ? 'text-achieved' : 'text-brand-700'}`}>{goal.percentage}%</span>
      </div>
      <ProgressBar value={goal.percentage} achieved={achieved} label={`Progreso de ${goal.title}`} />
      {count != null && (
        <span className="t-cap flex items-center gap-1.5">
          <UsersIcon className="size-4 text-ink-400" /> {count} aportaciones
        </span>
      )}
      {extra}
    </>
  )
  const style = { gap: 14, padding: padding ?? (large ? 18 : undefined) }
  if (!asLink) return <div className="ui-card" style={style}>{body}</div>
  return (
    <Link to={`/metas/${goal.id}`} className="ui-card transition hover:border-brand-100" style={style}>
      {body}
    </Link>
  )
}

/** Cuadro con ícono: corazón (abierta) o trofeo (lograda). */
export function GoalIcon({ achieved, size = 44 }: { achieved: boolean; size?: number }) {
  return (
    <span
      className={`ui-tile ${achieved ? 'bg-achieved-50 text-achieved' : 'bg-brand-50 text-brand-600'}`}
      style={{ width: size, height: size }}
    >
      {achieved ? <TrophyIcon /> : <HeartIcon />}
    </span>
  )
}
