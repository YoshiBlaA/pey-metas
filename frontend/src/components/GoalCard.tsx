import { Link } from 'react-router-dom'
import type { GoalPublicSummary } from '../api'
import { Money } from './Money'
import { ProgressBar } from './ProgressBar'
import { StatusBadge } from './StatusBadge'
import { HeartIcon, TrophyIcon } from './Icons'

/** Tarjeta de una meta en la lista pública. Toda la tarjeta es un enlace al detalle. */
export function GoalCard({ goal }: { goal: GoalPublicSummary }) {
  const achieved = goal.status === 'CLOSED'
  return (
    <Link
      to={`/metas/${goal.id}`}
      className="block rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <GoalIcon achieved={achieved} />
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-lg font-semibold leading-snug text-ink-900">{goal.title}</h2>
          <StatusBadge status={goal.status} />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2">
        <div>
          <Money amount={goal.raisedAmount} className="text-2xl font-bold" />
          <p className="text-sm text-ink-500">
            de <Money amount={goal.targetAmount} /> MXN
          </p>
        </div>
        <span className={`text-xl font-semibold ${achieved ? 'text-achieved' : 'text-brand-700'}`}>{goal.percentage}%</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={goal.percentage} achieved={achieved} label={`Progreso de ${goal.title}`} />
      </div>
    </Link>
  )
}

export function GoalIcon({ achieved, large }: { achieved: boolean; large?: boolean }) {
  const size = large ? 'size-14' : 'size-11'
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl ${size} ${
        achieved ? 'bg-achieved-50 text-achieved' : 'bg-brand-50 text-brand-600'
      }`}
    >
      {achieved ? <TrophyIcon /> : <HeartIcon />}
    </span>
  )
}
