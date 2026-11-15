// 01 · Lista de metas (móvil).
import { useState } from 'react'
import { publicApi, type GoalStatus } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { Logo } from '../../components/Layouts'
import { GoalCard } from '../../components/GoalCard'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'

const FILTERS: { label: string; value: GoalStatus | undefined }[] = [
  { label: 'Todas', value: undefined },
  { label: 'Abiertas', value: 'OPEN' },
  { label: 'Logradas', value: 'CLOSED' },
]

export function GoalsListPage() {
  const [status, setStatus] = useState<GoalStatus | undefined>(undefined)
  // El filtro se manda al backend (?status=OPEN|CLOSED); cada cambio vuelve a cargar.
  const { data: goals, error, loading, reload } = useAsync(() => publicApi.listGoals(status), [status])

  return (
    <>
      <header className="flex items-center justify-between py-5">
        <Logo />
      </header>

      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Apoya una meta</h1>
        <p className="text-ink-700">Aporta en segundos con CoDi desde la app de tu banco. Sin comisiones.</p>
      </section>

      <div className="mt-5 flex gap-2" role="group" aria-label="Filtrar metas">
        {FILTERS.map((f) => {
          const active = f.value === status
          return (
            <button
              key={f.label}
              aria-pressed={active}
              onClick={() => setStatus(f.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-ink-900 text-white' : 'border border-line bg-card text-ink-900 hover:bg-brand-50'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <section className="mt-5 space-y-4" aria-live="polite">
        {loading && <Spinner label="Cargando metas…" />}
        {!loading && error ? <ErrorAlert error={error} onRetry={() => void reload()} /> : null}
        {!loading && !error && goals?.length === 0 && (
          <p className="rounded-2xl border border-line bg-card p-6 text-center text-ink-700">No hay metas por aquí todavía.</p>
        )}
        {!loading && goals?.map((g) => <GoalCard key={g.id} goal={g} />)}
      </section>
    </>
  )
}
