// 11 · Progreso de una meta (admin): datos de la meta, conteos por estado y últimas aportaciones (cualquier estado).
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminApi } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { Chip, ContributionChip, StatusBadge } from '../../components/StatusBadge'
import { Avatar } from '../../components/ContributionRow'
import { Button, ButtonLink } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { DownloadIcon, PencilIcon, RefreshIcon } from '../../components/Icons'
import { formatDateTime, formatMoney } from '../../lib/format'
import { useIsAdminDesktop } from '../../hooks/useMediaQuery'
import { AppBar } from '../../components/Layouts'
import { useGoalActions } from './useGoalActions'
import { exportCsv } from '../../lib/contributionsCsv'

const FIRST = 6

const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

export function GoalProgressPage() {
  const id = Number(useParams().id)
  // Meta + conteos por estado + últimas 50 aportaciones (pagadas, pendientes y expiradas), en paralelo.
  const { data, setData, error, loading, reload } = useAsync(
    async () => {
      const [admin, stats, list] = await Promise.all([
        adminApi.getGoal(id),
        adminApi.contributionStats(id),
        adminApi.listContributions({ goalId: id, limit: 50 }),
      ])
      return { admin, stats, list }
    },
    [id],
  )
  const { toggle, busyId, actionError } = useGoalActions((g) => setData((d) => (d ? { ...d, admin: g } : d)))
  const [showAll, setShowAll] = useState(false)
  const desktop = useIsAdminDesktop()
  const bar = (right?: React.ReactNode) => (!desktop ? <AppBar title="Progreso de la meta" backTo="/admin" right={right} /> : null)

  if (loading) return <>{bar()}<Spinner label="Cargando progreso…" /></>
  if (error || !data) return <>{bar()}<ErrorAlert error={error ?? 'Meta no encontrada'} onRetry={() => void reload()} /></>

  const { admin: g, stats, list } = data
  const remaining = Math.max(0, g.targetAmount - g.raisedAmount)
  const closed = g.status === 'CLOSED'
  const done = closed && g.percentage >= 100
  const count = stats.paid
  const rows = showAll ? list : list.slice(0, FIRST)
  const presets = g.presetAmounts.map((p) => (Number.isInteger(p) ? `$${p.toLocaleString('es-MX')}` : formatMoney(p))).join(' · ')

  // ---- móvil (390×844) ----
  if (!desktop)
    return (
      <div className="pb-28">
        {bar(
          <Link to={`/admin/metas/${g.id}/editar`} className="ui-iconbtn" aria-label="Editar meta"><PencilIcon className="size-[18px]" /></Link>,
        )}
        <div className="ui-content" style={{ gap: 14 }}>
          <div className="flex items-center justify-between gap-3">
            <h1 className="t-h2">{g.title}</h1>
            <StatusBadge status={g.status} percentage={g.percentage} />
          </div>
          <ErrorAlert error={actionError} />
          <section className="ui-card">
            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                <span className="t-cap">Recaudado</span>
                <Money amount={g.raisedAmount} className="t-xl" style={{ fontSize: 30, lineHeight: '38px' }} />
                <span className="t-body">de <Money amount={g.targetAmount} /> MXN</span>
              </div>
              <span className={`text-[30px] font-extrabold ${done ? 'text-achieved' : 'text-brand-700'}`}>{g.percentage}%</span>
            </div>
            <ProgressBar value={g.percentage} size="lg" achieved={done} />
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-surface px-3 py-2.5"><div className="t-cap">Por reunir</div><div className="t-strong">{formatMoney(remaining)}</div></div>
              <div className="rounded-xl bg-surface px-3 py-2.5"><div className="t-cap">Promedio</div><div className="t-strong">{count ? formatMoney(g.raisedAmount / count) : '—'}</div></div>
            </div>
          </section>
          <div className="grid grid-cols-3 gap-2.5">
            {([['Pagadas', stats.paid, 'bg-brand-600', 'text-brand-700'], ['Pendientes', stats.pending, 'bg-pending', 'text-ink-900'], ['Expiradas', stats.expired, 'bg-expired', 'text-ink-900']] as const).map(([label, n, dot, color]) => (
              <div key={label} className="ui-kpi !gap-1 !rounded-[14px]" style={{ padding: 12 }}>
                <div className="flex items-center gap-1.5"><span className={`size-2 rounded-full ${dot}`} /><span className="t-cap">{label}</span></div>
                <span className={`t-h2 ${color}`}>{n}</span>
              </div>
            ))}
          </div>
          <section className="ui-card">
            <div className="flex items-center justify-between">
              <h2 className="t-h3">Últimas aportaciones</h2>
              {list.length > FIRST && (
                <button className="t-strong text-brand-700" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>{showAll ? 'Ver menos' : 'Ver todas'}</button>
              )}
            </div>
            {rows.length === 0 ? <p className="t-body">Aún no hay aportaciones.</p> : (
              <ul className="-my-3 divide-y divide-line">
                {rows.map((c, i) => (
                  <li key={c.id ?? i} className="flex items-start gap-3 py-3">
                    <Avatar name={c.name} size={36} />
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2"><span className="t-strong truncate">{c.name}</span><ContributionChip status={c.status} /></div>
                        <Money amount={c.amount} className="t-strong" />
                      </div>
                      {c.message && <span className="t-cap">{c.message}</span>}
                      <span className="t-cap !text-ink-400">{shortDate.format(new Date(c.paidAt ?? c.createdAt))} · Ref. {c.numRef}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <Button variant={closed ? 'secondary' : 'danger'} loading={busyId === g.id} onClick={() => void toggle(g)}>
            {closed ? 'Reabrir meta' : 'Cerrar meta'}
          </Button>
        </div>
        <div className="ui-bottombar !flex-row !gap-3">
          <Button variant="secondary" onClick={() => exportCsv(g.title, list)} disabled={!list.length}>
            <DownloadIcon className="size-4" /> Exportar CSV
          </Button>
          <ButtonLink to={`/admin/metas/${g.id}/editar`} variant="dark"><PencilIcon className="size-4" /> Editar meta</ButtonLink>
        </div>
      </div>
    )

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <nav className="t-crumb" aria-label="Ruta">
          <Link to="/admin" className="hover:text-ink-700">Metas</Link>
          <span className="mx-1.5">/</span>
          <span>{g.title}</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="t-h1">{g.title}</h1>
            <StatusBadge status={g.status} percentage={g.percentage} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={() => void reload(true)} aria-label="Actualizar datos">
              <RefreshIcon className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => exportCsv(g.title, list)} disabled={!list.length}>
              <DownloadIcon className="size-4" /> Exportar CSV
            </Button>
            <Button variant={closed ? 'secondary' : 'danger'} size="sm" loading={busyId === g.id} onClick={() => void toggle(g)}>
              {closed ? 'Reabrir meta' : 'Cerrar meta'}
            </Button>
            <ButtonLink to={`/admin/metas/${g.id}/editar`} variant="dark" size="sm">
              <PencilIcon className="size-4" /> Editar meta
            </ButtonLink>
          </div>
        </div>
      </div>

      <ErrorAlert error={actionError} />

      <div className="flex flex-col gap-6 xl:flex-row xl:items-stretch">
        <section className="ui-card flex-1" style={{ padding: 24, gap: 16 }}>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="t-cap">Recaudado</span>
              <Money amount={g.raisedAmount} className="t-xl" />
              <span className="t-body">de <Money amount={g.targetAmount} /> MXN</span>
            </div>
            <span className={`text-[40px] font-extrabold ${done ? 'text-achieved' : 'text-brand-700'}`}>{g.percentage}%</span>
          </div>
          <ProgressBar value={g.percentage} size="lg" achieved={done} />
          <div className="grid grid-cols-3 gap-3">
            <Tile label="Por reunir" value={formatMoney(remaining)} />
            <Tile label="Aportación promedio" value={count ? formatMoney(g.raisedAmount / count) : '—'} />
            <Tile label="Montos sugeridos" value={presets || 'Ninguno'} small />
          </div>
        </section>

        <section className="ui-card xl:w-[340px]" style={{ padding: 24, gap: 14 }}>
          <h2 className="t-h3">Aportaciones</h2>
          <div className="flex items-center justify-between"><Chip kind="paid">Pagadas</Chip><span className="t-h3">{stats.paid}</span></div>
          <div className="flex items-center justify-between"><Chip kind="pending">Pendientes</Chip><span className="t-h3">{stats.pending}</span></div>
          <div className="flex items-center justify-between"><Chip kind="expired">Expiradas</Chip><span className="t-h3">{stats.expired}</span></div>
          <div className="h-px bg-line" />
          <dl className="t-cap flex flex-col gap-1.5">
            <div className="flex justify-between"><dt>Creada</dt><dd>{formatDateTime(g.createdAt)}</dd></div>
            <div className="flex justify-between"><dt>Actualizada</dt><dd>{formatDateTime(g.updatedAt)}</dd></div>
          </dl>
          <span className="t-cap !text-ink-400">Los QR pendientes vencen a los 20 minutos.</span>
        </section>
      </div>

      <section className="ui-card !gap-0 overflow-hidden !p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="t-h3">Últimas aportaciones</h2>
          {list.length > FIRST && (
            <button className="t-strong text-brand-700" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
              {showAll ? 'Ver menos' : 'Ver todas'}
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="t-body border-t border-line p-8 text-center">Aún no hay aportaciones.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr><th scope="col">Nombre</th><th scope="col">Mensaje</th><th scope="col">Monto</th><th scope="col">Estado</th><th scope="col">Fecha</th><th scope="col">Referencia</th></tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.id ?? i}>
                    <td><div className="flex items-center gap-2.5"><Avatar name={c.name} size={32} /><span className="t-strong">{c.name}</span></div></td>
                    <td className="max-w-[260px] text-ink-700">{c.message || '—'}</td>
                    <td className="t-strong"><Money amount={c.amount} /></td>
                    <td><ContributionChip status={c.status} /></td>
                    <td className="text-ink-700">{shortDate.format(new Date(c.paidAt ?? c.createdAt))}</td>
                    <td className="t-cap !text-ink-400 tabular-nums">{c.numRef}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function Tile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-surface px-3.5 py-3">
      <div className="t-cap">{label}</div>
      <div className="t-h3" style={small ? { fontSize: 15 } : undefined}>{value}</div>
    </div>
  )
}
