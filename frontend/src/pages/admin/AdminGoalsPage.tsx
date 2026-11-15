// 09 · Panel de metas (1440×900): KPIs + tabla con progreso.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, type GoalAdminResponse } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { Chip, StatusBadge } from '../../components/StatusBadge'
import { ButtonLink } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { EyeIcon, PencilIcon, PlusIcon, SearchIcon } from '../../components/Icons'
import { formatMoney, formatRelative } from '../../lib/format'
import { useGoalCounts } from '../../hooks/useGoalCounts'
import { useIsAdminDesktop } from '../../hooks/useMediaQuery'
import { useAuth } from '../../auth/AuthContext'
import { Logo } from '../../components/Layouts'
import { initials } from '../../lib/format'

type Filter = 'ALL' | 'OPEN' | 'CLOSED'

export function AdminGoalsPage() {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [query, setQuery] = useState('')
  // Traemos todas y filtramos en el navegador (así los contadores de los chips son exactos).
  const { data: goals, error, loading, reload } = useAsync(() => adminApi.listGoals(), [])
  const counts = useGoalCounts(goals)
  // Conteos de aportaciones (pagadas, pendientes) y lo pagado en 7 días; si falla, los KPIs usan lo que haya.
  const { data: stats } = useAsync(() => adminApi.contributionStats().catch(() => null), [])

  const all = goals ?? []
  const open = all.filter((g) => g.status === 'OPEN')
  const closed = all.filter((g) => g.status === 'CLOSED')
  const achieved = closed.filter((g) => g.percentage >= 100)
  const raised = all.reduce((s, g) => s + g.raisedAmount, 0)
  const countValues = Object.values(counts)
  const summed = countValues.length === all.length && countValues.every((c) => c !== null) ? countValues.reduce((s, c) => s + (c ?? 0), 0) : null
  const paid = stats ? stats.paid : summed

  const desktop = useIsAdminDesktop()
  const { session } = useAuth()
  const q = query.trim().toLowerCase()
  const visible = (filter === 'ALL' ? all : filter === 'OPEN' ? open : closed).filter((g) => !q || g.title.toLowerCase().includes(q))

  const chips = (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
      <FilterChip active={filter === 'ALL'} onClick={() => setFilter('ALL')} kind="closed">Todas · {all.length}</FilterChip>
      <FilterChip active={filter === 'OPEN'} onClick={() => setFilter('OPEN')} kind="open">Abiertas · {open.length}</FilterChip>
      <FilterChip active={filter === 'CLOSED'} onClick={() => setFilter('CLOSED')} kind="done">Logradas · {closed.length}</FilterChip>
    </div>
  )
  const kpis = {
    raised: { label: 'Recaudado total', value: goals ? formatMoney(raised) : '—', color: 'text-brand-700', note: stats ? `+${formatMoney(stats.paidAmountLast7Days)} ${desktop ? 'esta semana' : 'en 7 días'}` : `en ${all.length} metas` },
    paid: { label: 'Aportaciones pagadas', value: paid !== null ? String(paid) : '—', color: 'text-ink-900', note: stats ? `${stats.pending} ${stats.pending === 1 ? 'pendiente' : 'pendientes'} de pago` : 'en todas las metas' },
    open: { label: 'Metas abiertas', value: goals ? String(open.length) : '—', color: 'text-ink-900', note: `de ${all.length} metas` },
    done: {
      label: 'Metas logradas',
      value: goals ? String(achieved.length) : '—',
      color: 'text-achieved',
      note: closed.length > achieved.length ? `${closed.length - achieved.length} cerradas sin llegar al 100%` : 'cerradas al 100%',
    },
  }

  // ---- móvil (390×844): KPIs 2×2 y metas como tarjetas ----
  if (!desktop)
    return (
      <>
        <header className="flex h-[60px] items-center justify-between px-5">
          <Logo to="/admin" />
          <span className="ui-tile size-9 !rounded-full bg-achieved-50 text-[13px] font-bold text-achieved" aria-label={session?.username}>
            {initials(session?.username || '?')}
          </span>
        </header>
        <div className="ui-content !pt-1" style={{ gap: 14 }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="t-h1">Metas</h1>
              <p className="t-cap">Crea y da seguimiento a tus metas.</p>
            </div>
            <ButtonLink to="/admin/metas/nueva" size="sm" className="!px-3.5"><PlusIcon className="size-4" /> Nueva meta</ButtonLink>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {[kpis.raised, kpis.paid, kpis.open, kpis.done].map((k) => (
              <div key={k.label} className="ui-kpi !gap-0.5 !rounded-[14px]" style={{ padding: '12px 14px' }}>
                <span className="t-cap">{k.label}</span>
                <span className={`t-h2 tabular-nums ${k.color}`} style={{ fontSize: 19, lineHeight: '26px' }}>{k.value}</span>
                <span className="t-cap !text-ink-400">{k.note}</span>
              </div>
            ))}
          </div>
          {chips}
          <label className="ui-input !h-11 text-[14px]">
            <SearchIcon className="size-4 text-ink-400" />
            <input placeholder="Buscar meta…" aria-label="Buscar meta" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {loading ? <Spinner label="Cargando metas…" /> : error ? <ErrorAlert error={error} onRetry={() => void reload()} /> : visible.length === 0 ? (
            <p className="ui-card t-body text-center">{all.length ? 'Ninguna meta coincide.' : 'No hay metas. Crea la primera con “Nueva meta”.'}</p>
          ) : (
            visible.map((g) => <MobileGoalCard key={g.id} g={g} count={counts[g.id]} />)
          )}
        </div>
      </>
    )

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="t-h1">Metas</h1>
          <p className="t-body">Crea y da seguimiento a las metas de donación.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="ui-input !h-11 !w-[280px] text-[14px]">
            <SearchIcon className="size-4 text-ink-400" />
            <input placeholder="Buscar meta…" aria-label="Buscar meta" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <ButtonLink to="/admin/metas/nueva" size="sm">
            <PlusIcon className="size-4" /> Nueva meta
          </ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[kpis.raised, kpis.open, kpis.done, kpis.paid].map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      <div className="ui-card !gap-0 overflow-hidden !p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-[18px]">
          <h2 className="t-h3">Todas las metas</h2>
          {chips}
        </div>
        {loading ? (
          <Spinner label="Cargando metas…" />
        ) : error ? (
          <div className="p-6"><ErrorAlert error={error} onRetry={() => void reload()} /></div>
        ) : visible.length === 0 ? (
          <p className="t-body border-t border-line p-8 text-center">{all.length ? 'Ninguna meta coincide.' : 'No hay metas. Crea la primera con “Nueva meta”.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th scope="col">Meta</th>
                  <th scope="col">Progreso</th>
                  <th scope="col">Recaudado</th>
                  <th scope="col">Objetivo</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((g) => <Row key={g.id} g={g} count={counts[g.id]} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function Row({ g, count }: { g: GoalAdminResponse; count: number | null | undefined }) {
  const done = g.status === 'CLOSED' && g.percentage >= 100
  return (
    <tr className="hover:bg-[#FAFBFB]">
      <td>
        <div className="flex flex-col gap-0.5">
          <Link to={`/admin/metas/${g.id}`} className="t-strong hover:text-brand-700">{g.title}</Link>
          <span className="t-cap !text-ink-400">
            {count != null ? `${count} aportaciones · ` : ''}actualizada {formatRelative(g.updatedAt)}
          </span>
        </div>
      </td>
      <td className="w-[240px]">
        <div className="flex items-center gap-3">
          <ProgressBar value={g.percentage} achieved={done} className="!w-40" label={`Progreso de ${g.title}`} />
          <span className={`t-strong ${done ? 'text-achieved' : 'text-brand-700'}`}>{g.percentage}%</span>
        </div>
      </td>
      <td className="t-strong"><Money amount={g.raisedAmount} /></td>
      <td className="text-ink-700"><Money amount={g.targetAmount} /></td>
      <td><StatusBadge status={g.status} percentage={g.percentage} /></td>
      <td className="w-[110px]">
        <div className="flex gap-2">
          <Link to={`/admin/metas/${g.id}`} className="ui-iconbtn !size-[34px]" aria-label={`Ver progreso de ${g.title}`} title="Ver progreso">
            <EyeIcon className="size-4" />
          </Link>
          <Link to={`/admin/metas/${g.id}/editar`} className="ui-iconbtn !size-[34px]" aria-label={`Editar ${g.title}`} title="Editar">
            <PencilIcon className="size-4" />
          </Link>
        </div>
      </td>
    </tr>
  )
}

function Kpi({ label, value, note, color = 'text-ink-900' }: { label: string; value: string; note: string; color?: string }) {
  return (
    <div className="ui-kpi">
      <span className="t-cap">{label}</span>
      <span className={`t-h1 tabular-nums ${color}`}>{value}</span>
      <span className="t-cap !text-ink-400">{note}</span>
    </div>
  )
}

function FilterChip({ active, onClick, kind, children }: { active: boolean; onClick: () => void; kind: 'open' | 'done' | 'closed'; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={`rounded-full ${active ? '' : 'opacity-80 hover:opacity-100'}`}>
      <Chip kind={active ? 'on' : kind}>{children}</Chip>
    </button>
  )
}

/** Tarjeta de meta para el panel en móvil (en vez de la tabla). */
function MobileGoalCard({ g, count }: { g: GoalAdminResponse; count: number | null | undefined }) {
  const done = g.status === 'CLOSED' && g.percentage >= 100
  return (
    <div className="ui-card" style={{ padding: '14px 16px', gap: 10 }}>
      {/* El subtítulo ocupa todo el ancho (debajo del chip) para que quepa en una línea. */}
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-0.5">
        <Link to={`/admin/metas/${g.id}`} className="t-strong min-w-0 hover:text-brand-700" style={{ fontSize: 15 }}>{g.title}</Link>
        <StatusBadge status={g.status} percentage={g.percentage} />
        <span className="t-cap col-span-2 truncate !text-ink-400">{count != null ? `${count} aportaciones · ` : ''}actualizada {formatRelative(g.updatedAt)}</span>
      </div>
      <div className="flex items-center gap-2.5">
        <ProgressBar value={g.percentage} achieved={done} label={`Progreso de ${g.title}`} />
        <span className={`t-strong ${done ? 'text-achieved' : 'text-brand-700'}`}>{g.percentage}%</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="t-body"><b className="text-ink-900"><Money amount={g.raisedAmount} /></b> de <Money amount={g.targetAmount} /></span>
        <div className="flex gap-2">
          <Link to={`/admin/metas/${g.id}`} className="ui-iconbtn !size-[34px]" aria-label={`Ver progreso de ${g.title}`}><EyeIcon className="size-4" /></Link>
          <Link to={`/admin/metas/${g.id}/editar`} className="ui-iconbtn !size-[34px]" aria-label={`Editar ${g.title}`}><PencilIcon className="size-4" /></Link>
        </div>
      </div>
    </div>
  )
}
