// 09 · Panel de administración: tabla de metas con progreso y acciones.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, type GoalStatus } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { StatusBadge } from '../../components/StatusBadge'
import { Button, ButtonLink } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { formatDateTime } from '../../lib/format'
import { useGoalActions } from './useGoalActions'

export function AdminGoalsPage() {
  const [status, setStatus] = useState<GoalStatus | ''>('')
  const { data: goals, setData, error, loading, reload } = useAsync(() => adminApi.listGoals(status || undefined), [status])
  // Tras cerrar/reabrir reemplazamos la meta en la lista sin recargar todo.
  const { toggle, busyId, actionError } = useGoalActions((g) =>
    setData((list) => list?.map((x) => (x.id === g.id ? g : x)) ?? null),
  )

  const totals = (goals ?? []).reduce(
    (t, g) => ({ raised: t.raised + g.raisedAmount, open: t.open + (g.status === 'OPEN' ? 1 : 0) }),
    { raised: 0, open: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-ink-700">Gestiona las metas de recaudación y su estado.</p>
        </div>
        <ButtonLink to="/admin/metas/nueva">+ Nueva meta</ButtonLink>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Metas" value={String(goals?.length ?? '—')} />
        <Stat label="Abiertas" value={String(goals ? totals.open : '—')} />
        <Stat label="Recaudado (vista actual)" value={goals ? <Money amount={totals.raised} /> : '—'} />
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="status-filter" className="text-sm font-medium text-ink-700">Estado</label>
        <select
          id="status-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value as GoalStatus | '')}
          className="rounded-xl border border-ink-300 bg-card px-3 py-2 text-sm"
        >
          <option value="">Todas</option>
          <option value="OPEN">Abiertas</option>
          <option value="CLOSED">Logradas / cerradas</option>
        </select>
      </div>

      <ErrorAlert error={actionError} />

      <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        {loading ? (
          <Spinner label="Cargando metas…" />
        ) : error ? (
          <div className="p-6"><ErrorAlert error={error} onRetry={() => void reload()} /></div>
        ) : goals?.length === 0 ? (
          <p className="p-8 text-center text-ink-700">No hay metas. Crea la primera con “Nueva meta”.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Meta</th>
                <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                <th scope="col" className="w-64 px-5 py-3 font-semibold">Progreso</th>
                <th scope="col" className="px-5 py-3 font-semibold">Actualizada</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {goals?.map((g) => (
                <tr key={g.id} className="hover:bg-brand-50/50">
                  <td className="px-5 py-4">
                    <Link to={`/admin/metas/${g.id}`} className="font-semibold hover:text-brand-700">{g.title}</Link>
                    <p className="text-xs text-ink-400">ID {g.id}</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={g.status} percentage={g.percentage} /></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-between text-xs">
                      <span><Money amount={g.raisedAmount} className="font-semibold" /> / <Money amount={g.targetAmount} /></span>
                      <span className="font-semibold">{g.percentage}%</span>
                    </div>
                    <div className="mt-1.5"><ProgressBar value={g.percentage} achieved={g.status === 'CLOSED'} label={`Progreso de ${g.title}`} /></div>
                  </td>
                  <td className="px-5 py-4 text-ink-700">{formatDateTime(g.updatedAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <ButtonLink to={`/admin/metas/${g.id}`} variant="ghost" size="sm">Progreso</ButtonLink>
                      <ButtonLink to={`/admin/metas/${g.id}/editar`} variant="secondary" size="sm">Editar</ButtonLink>
                      <Button
                        variant={g.status === 'OPEN' ? 'danger' : 'secondary'}
                        size="sm"
                        loading={busyId === g.id}
                        onClick={() => void toggle(g)}
                      >
                        {g.status === 'OPEN' ? 'Cerrar' : 'Reabrir'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <p className="text-sm text-ink-700">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
