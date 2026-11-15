// 02 · Detalle de meta abierta  /  03 · Detalle de meta lograda (CLOSED, sin botón de aportar).
import { useParams } from 'react-router-dom'
import { publicApi } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { TopBar } from '../../components/Layouts'
import { GoalIcon } from '../../components/GoalCard'
import { StatusBadge } from '../../components/StatusBadge'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { ContributionRow } from '../../components/ContributionRow'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { ButtonLink } from '../../components/Button'
import { TrophyIcon } from '../../components/Icons'

export function GoalDetailPage() {
  const id = Number(useParams().id)
  const { data: goal, error, loading, reload } = useAsync(() => publicApi.getGoal(id, 10), [id])

  if (loading) return <Spinner label="Cargando meta…" />
  if (error || !goal)
    return (
      <>
        <TopBar title="Detalle de la meta" backTo="/" />
        <ErrorAlert error={error ?? 'Meta no encontrada'} onRetry={() => void reload()} />
      </>
    )

  const achieved = goal.status === 'CLOSED'
  const remaining = Math.max(0, goal.targetAmount - goal.raisedAmount)

  return (
    <div className={achieved ? '' : 'pb-24'}>
      <TopBar title="Detalle de la meta" backTo="/" />

      {/* Portada con degradado: verde si está abierta, índigo si se logró */}
      <div
        className={`rounded-2xl p-4 ${
          achieved ? 'bg-gradient-to-r from-achieved to-[#8b83e6]' : 'bg-gradient-to-r from-brand-600 to-brand-400'
        }`}
      >
        <div className="flex flex-col items-start gap-5">
          <span className="rounded-full bg-card/90">
            <StatusBadge status={goal.status} />
          </span>
          <span className="rounded-2xl bg-card p-1">
            <GoalIcon achieved={achieved} large />
          </span>
        </div>
      </div>

      <h2 className="mt-4 text-2xl font-bold tracking-tight">{goal.title}</h2>

      {achieved && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-achieved-50 p-4 text-achieved">
          <TrophyIcon className="size-6 shrink-0" />
          <p className="font-semibold">¡Meta lograda! Gracias a todas las personas que aportaron.</p>
        </div>
      )}

      {/* Tarjeta principal de progreso */}
      <section className="mt-4 rounded-2xl border border-line bg-card p-5 shadow-sm" aria-label="Progreso">
        <Money amount={goal.raisedAmount} className="text-4xl font-extrabold tracking-tight" />
        <p className="text-ink-700">
          recaudados de <Money amount={goal.targetAmount} /> MXN
        </p>
        <div className="mt-4">
          <ProgressBar value={goal.percentage} size="lg" achieved={achieved} />
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          <div>
            <dt className="sr-only">Porcentaje</dt>
            <dd className={`font-bold ${achieved ? 'text-achieved' : 'text-brand-700'}`}>{goal.percentage}%</dd>
            <dd className="text-sm text-ink-700">completado</dd>
          </div>
          <div>
            <dt className="sr-only">Aportaciones</dt>
            <dd className="font-bold">{goal.paidContributionsCount}</dd>
            <dd className="text-sm text-ink-700">aportaciones</dd>
          </div>
          <div>
            <dt className="sr-only">Por reunir</dt>
            <dd className="font-bold">
              <Money amount={remaining} />
            </dd>
            <dd className="text-sm text-ink-700">por reunir</dd>
          </div>
        </dl>
      </section>

      {goal.description && (
        <section className="mt-6">
          <h3 className="text-lg font-semibold">Sobre esta meta</h3>
          <p className="mt-1 whitespace-pre-line text-ink-700">{goal.description}</p>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-line bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Últimas aportaciones</h3>
        {goal.recentContributions.length === 0 ? (
          <p className="py-4 text-ink-700">Aún no hay aportaciones. ¡Sé la primera persona en apoyar!</p>
        ) : (
          <ul className="divide-y divide-line">
            {goal.recentContributions.map((c, i) => (
              <ContributionRow key={`${c.paidAt}-${i}`} c={c} />
            ))}
          </ul>
        )}
      </section>

      {/* Barra fija inferior con el botón principal (solo si la meta sigue abierta) */}
      {!achieved && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-card">
          <div className="mx-auto flex max-w-md items-center gap-4 px-4 py-3">
            <div className="shrink-0">
              <p className="text-xs text-ink-700">Faltan</p>
              <Money amount={remaining} className="text-lg font-bold" />
            </div>
            <ButtonLink to={`/metas/${goal.id}/aportar`} size="lg">
              Aportar
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  )
}
