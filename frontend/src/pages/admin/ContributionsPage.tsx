// Aportaciones (admin): todas las aportaciones de todas las metas, en cualquier estado.
// No hay diseño propio en Figma: sigue el estilo del panel de metas y de la tabla de progreso.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, type AdminContribution, type ContributionStatus } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { useIsAdminDesktop } from '../../hooks/useMediaQuery'
import { Money } from '../../components/Money'
import { Chip, ContributionChip, type ChipKind } from '../../components/StatusBadge'
import { Avatar } from '../../components/ContributionRow'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { DownloadIcon, RefreshIcon, SearchIcon } from '../../components/Icons'
import { Logo } from '../../components/Layouts'
import { formatMoney } from '../../lib/format'
import { exportCsv } from '../../lib/contributionsCsv'

type Filter = 'ALL' | ContributionStatus
const LIMIT = 1000
const PAGE = 50

const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
const when = (c: AdminContribution) => shortDate.format(new Date(c.paidAt ?? c.createdAt)).replace('.', '')

export function ContributionsPage() {
  const desktop = useIsAdminDesktop()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [goalId, setGoalId] = useState<number | 'ALL'>('ALL')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const { data, error, loading, reload } = useAsync(async () => {
    const [list, stats] = await Promise.all([adminApi.listContributions({ limit: LIMIT }), adminApi.contributionStats()])
    return { list, stats }
  }, [])

  const all = data?.list ?? []
  const goals = [...new Map(all.map((c) => [c.goalId, c.goalTitle])).entries()].sort((a, b) => a[1].localeCompare(b[1]))
  const q = query.trim().toLowerCase()
  const byGoalAndText = all.filter(
    (c) => (goalId === 'ALL' || c.goalId === goalId) && (!q || c.name.toLowerCase().includes(q) || c.numRef.includes(q) || (c.message ?? '').toLowerCase().includes(q)),
  )
  const countOf = (f: Filter) => (f === 'ALL' ? byGoalAndText.length : byGoalAndText.filter((c) => c.status === f).length)
  const visible = filter === 'ALL' ? byGoalAndText : byGoalAndText.filter((c) => c.status === filter)
  const rows = visible.slice(0, shown)
  const stats = data?.stats

  const chips = (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
      {([['ALL', 'Todas', 'closed'], ['PAID', 'Pagadas', 'paid'], ['PENDING', 'Pendientes', 'pending'], ['EXPIRED', 'Expiradas', 'expired']] as const).map(([f, label, kind]) => (
        <FilterChip key={f} active={filter === f} kind={kind} onClick={() => { setFilter(f); setShown(PAGE) }}>
          {label} · {countOf(f)}
        </FilterChip>
      ))}
    </div>
  )
  const filters = (
    <div className={`flex gap-3 ${desktop ? 'items-center' : 'flex-col'}`}>
      <label className={`ui-input !h-11 text-[14px] ${desktop ? '!w-[260px]' : ''}`}>
        <SearchIcon className="size-4 text-ink-400" />
        <input placeholder="Nombre, mensaje o referencia…" aria-label="Buscar aportación" value={query} onChange={(e) => { setQuery(e.target.value); setShown(PAGE) }} />
      </label>
      <label className={`ui-input !h-11 text-[14px] ${desktop ? '!w-[240px]' : ''}`}>
        <span className="sr-only">Meta</span>
        <select className="w-full bg-transparent outline-none" value={goalId} onChange={(e) => { setGoalId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)); setShown(PAGE) }}>
          <option value="ALL">Todas las metas</option>
          {goals.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
      </label>
    </div>
  )
  const kpis = [
    { label: 'Pagadas', value: stats ? String(stats.paid) : '—', note: stats ? `+${formatMoney(stats.paidAmountLast7Days)} en 7 días` : '', color: 'text-brand-700' },
    { label: 'Pendientes', value: stats ? String(stats.pending) : '—', note: 'QR vigentes sin pagar', color: 'text-ink-900' },
    { label: 'Expiradas', value: stats ? String(stats.expired) : '—', note: 'vencieron sin pago', color: 'text-ink-900' },
  ]
  const more = visible.length > rows.length && (
    <div className="flex justify-center p-4">
      <Button variant="secondary" size="sm" className="!w-48" onClick={() => setShown((n) => n + PAGE)}>Ver más ({visible.length - rows.length})</Button>
    </div>
  )
  const empty = <p className="t-body p-8 text-center">{all.length ? 'Ninguna aportación coincide.' : 'Todavía no hay aportaciones.'}</p>
  const capped = all.length >= LIMIT && <p className="t-cap px-5 pb-4 !text-ink-400">Se muestran las {LIMIT} más recientes.</p>
  const csv = () => exportCsv('todas', visible)

  // ---- móvil ----
  if (!desktop)
    return (
      <>
        <header className="flex h-[60px] items-center justify-between px-5">
          <Logo to="/admin" />
          <button className="ui-iconbtn" onClick={() => void reload(true)} aria-label="Actualizar"><RefreshIcon className="size-[18px]" /></button>
        </header>
        <div className="ui-content !pt-1" style={{ gap: 14 }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="t-h1">Aportaciones</h1>
              <p className="t-cap">Todas las aportaciones de tus metas.</p>
            </div>
            <Button variant="secondary" size="sm" className="!w-auto !px-3.5" onClick={csv} disabled={!visible.length}><DownloadIcon className="size-4" /> CSV</Button>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {kpis.map((k) => (
              <div key={k.label} className="ui-kpi !gap-0.5 !rounded-[14px]" style={{ padding: '12px 12px' }}>
                <span className="t-cap">{k.label}</span>
                <span className={`t-h2 tabular-nums ${k.color}`} style={{ fontSize: 19, lineHeight: '26px' }}>{k.value}</span>
              </div>
            ))}
          </div>
          {chips}
          {filters}
          {loading ? <Spinner label="Cargando aportaciones…" /> : error ? <ErrorAlert error={error} onRetry={() => void reload()} /> : rows.length === 0 ? (
            <div className="ui-card !p-0">{empty}</div>
          ) : (
            <section className="ui-card !gap-0 !py-1">
              <ul className="divide-y divide-line">
                {rows.map((c) => (
                  <li key={c.id} className="flex items-start gap-3 py-3">
                    <Avatar name={c.name} size={36} />
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="t-strong truncate">{c.name}</span>
                        <Money amount={c.amount} className="t-strong" />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/admin/metas/${c.goalId}`} className="t-cap truncate hover:text-brand-700">{c.goalTitle}</Link>
                        <ContributionChip status={c.status} />
                      </div>
                      {c.message && <span className="t-cap">{c.message}</span>}
                      <span className="t-cap !text-ink-400">{when(c)} · Ref. {c.numRef}</span>
                    </div>
                  </li>
                ))}
              </ul>
              {more}
            </section>
          )}
          {capped}
        </div>
      </>
    )

  // ---- escritorio ----
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="t-h1">Aportaciones</h1>
          <p className="t-body">Todas las aportaciones de tus metas: pagadas, pendientes y expiradas.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => void reload(true)} aria-label="Actualizar datos"><RefreshIcon className="size-4" /></Button>
          <Button variant="secondary" size="sm" onClick={csv} disabled={!visible.length}><DownloadIcon className="size-4" /> Exportar CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="ui-kpi">
            <span className="t-cap">{k.label}</span>
            <span className={`t-h1 tabular-nums ${k.color}`}>{k.value}</span>
            <span className="t-cap !text-ink-400">{k.note}</span>
          </div>
        ))}
      </div>

      <div className="ui-card !gap-0 overflow-hidden !p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-[18px]">
          {chips}
          {filters}
        </div>
        {loading ? (
          <Spinner label="Cargando aportaciones…" />
        ) : error ? (
          <div className="p-6"><ErrorAlert error={error} onRetry={() => void reload()} /></div>
        ) : rows.length === 0 ? (
          <div className="border-t border-line">{empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th scope="col">Nombre</th><th scope="col">Meta</th><th scope="col">Mensaje</th><th scope="col">Monto</th>
                  <th scope="col">Estado</th><th scope="col">Fecha</th><th scope="col">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td><div className="flex items-center gap-2.5"><Avatar name={c.name} size={32} /><span className="t-strong">{c.name}</span></div></td>
                    <td className="max-w-[220px]"><Link to={`/admin/metas/${c.goalId}`} className="text-ink-700 hover:text-brand-700">{c.goalTitle}</Link></td>
                    <td className="max-w-[240px] text-ink-700">{c.message || '—'}</td>
                    <td className="t-strong"><Money amount={c.amount} /></td>
                    <td><ContributionChip status={c.status} /></td>
                    <td className="whitespace-nowrap text-ink-700">{when(c)}</td>
                    <td className="t-cap !text-ink-400 tabular-nums">{c.numRef}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {more}
          </div>
        )}
        {capped}
      </div>
    </>
  )
}

function FilterChip({ active, onClick, kind, children }: { active: boolean; onClick: () => void; kind: ChipKind; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active} className={`rounded-full ${active ? '' : 'opacity-80 hover:opacity-100'}`}>
      <Chip kind={active ? 'on' : kind}>{children}</Chip>
    </button>
  )
}
