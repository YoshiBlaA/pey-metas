// 11 · Progreso de una meta (admin): datos de la meta + aportaciones pagadas recientes.
import { useParams } from 'react-router-dom'
import { adminApi, publicApi } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { StatusBadge } from '../../components/StatusBadge'
import { ContributionRow } from '../../components/ContributionRow'
import { Button, ButtonLink } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { formatDateTime, formatMoney } from '../../lib/format'
import { useGoalActions } from './useGoalActions'

export function GoalProgressPage() {
  const id = Number(useParams().id)
  // Datos admin (fechas) + detalle público (conteo y últimas 50 aportaciones), en paralelo.
  const { data, setData, error, loading, reload } = useAsync(
    async () => {
      const [admin, detail] = await Promise.all([adminApi.getGoal(id), publicApi.getGoal(id, 50)])
      return { admin, detail }
    },
    [id],
  )
  const { toggle, busyId, actionError } = useGoalActions((g) => setData((d) => (d ? { ...d, admin: g } : d)))

  if (loading) return <Spinner label="Cargando progreso…" />
  if (error || !data) return <ErrorAlert error={error ?? 'Meta no encontrada'} onRetry={() => void reload()} />

  const { admin: g, detail } = data
  const remaining = Math.max(0, g.targetAmount - g.raisedAmount)
  const achieved = g.status === 'CLOSED'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <ButtonLink to="/admin" variant="ghost" size="sm">← Volver a metas</ButtonLink>
          <h1 className="text-3xl font-bold tracking-tight">{g.title}</h1>
          <div className="flex items-center gap-3 text-sm text-ink-700">
            <StatusBadge status={g.status} percentage={g.percentage} />
            <span>Creada {formatDateTime(g.createdAt)} · Actualizada {formatDateTime(g.updatedAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void reload(true)}>Actualizar</Button>
          <ButtonLink to={`/admin/metas/${g.id}/editar`} variant="secondary">Editar</ButtonLink>
          <Button variant={achieved ? 'secondary' : 'danger'} loading={busyId === g.id} onClick={() => void toggle(g)}>
            {achieved ? 'Reabrir' : 'Cerrar meta'}
          </Button>
        </div>
      </div>

      <ErrorAlert error={actionError} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
            <div className="flex items-end justify-between">
              <div>
                <Money amount={g.raisedAmount} className="text-4xl font-extrabold tracking-tight" />
                <p className="text-ink-700">recaudados de <Money amount={g.targetAmount} /> MXN</p>
              </div>
              <span className={`text-3xl font-bold ${achieved ? 'text-achieved' : 'text-brand-700'}`}>{g.percentage}%</span>
            </div>
            <div className="mt-4"><ProgressBar value={g.percentage} size="lg" achieved={achieved} /></div>
            <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-5">
              <Item label="Aportaciones pagadas" value={String(detail.paidContributionsCount)} />
              <Item label="Por reunir" value={formatMoney(remaining)} />
              <Item
                label="Promedio por aportación"
                value={detail.paidContributionsCount ? formatMoney(g.raisedAmount / detail.paidContributionsCount) : '—'}
              />
            </dl>
          </div>

          <div className="rounded-2xl border border-line bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Descripción</h2>
            <p className="mt-1 whitespace-pre-line text-ink-700">{g.description || 'Sin descripción.'}</p>
            <h3 className="mt-5 text-sm font-semibold text-ink-700">Montos sugeridos</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.presetAmounts.length === 0 && <span className="text-sm text-ink-400">Ninguno</span>}
              {g.presetAmounts.map((p) => (
                <span key={p} className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">{formatMoney(p)}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Últimas aportaciones</h2>
          <p className="text-xs text-ink-400">Hasta 50 más recientes</p>
          {detail.recentContributions.length === 0 ? (
            <p className="py-6 text-sm text-ink-700">Aún no hay aportaciones pagadas.</p>
          ) : (
            <ul className="mt-2 max-h-[560px] divide-y divide-line overflow-y-auto pr-1">
              {detail.recentContributions.map((c, i) => <ContributionRow key={`${c.paidAt}-${i}`} c={c} />)}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-700">{label}</dt>
      <dd className="mt-0.5 text-xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
