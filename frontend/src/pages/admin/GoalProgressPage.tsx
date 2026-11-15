// 11 · Progreso de una meta (admin): datos de la meta + aportaciones pagadas recientes.
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminApi, publicApi, type RecentContribution } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { Chip, StatusBadge } from '../../components/StatusBadge'
import { Avatar } from '../../components/ContributionRow'
import { Button, ButtonLink } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { DownloadIcon, PencilIcon, RefreshIcon } from '../../components/Icons'
import { formatDateTime, formatMoney } from '../../lib/format'
import { useIsAdminDesktop } from '../../hooks/useMediaQuery'
import { AppBar } from '../../components/Layouts'
import { useGoalActions } from './useGoalActions'

const FIRST = 6

const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })

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
  const [showAll, setShowAll] = useState(false)
  const desktop = useIsAdminDesktop()
  const bar = (right?: React.ReactNode) => (!desktop ? <AppBar title="Progreso de la meta" backTo="/admin" right={right} /> : null)

  if (loading) return <>{bar()}<Spinner label="Cargando progreso…" /></>
  if (error || !data) return <>{bar()}<ErrorAlert error={error ?? 'Meta no encontrada'} onRetry={() => void reload()} /></>

  const { admin: g, detail } = data
  const remaining = Math.max(0, g.targetAmount - g.raisedAmount)
  const closed = g.status === 'CLOSED'
  const done = closed && g.percentage >= 100
  const count = detail.paidContributionsCount
  const rows = showAll ? detail.recentContributions : detail.recentContributions.slice(0, FIRST)
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
          <div className="ui-kpi !gap-1 !rounded-[14px]" style={{ padding: 12 }}>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-brand-600" /><span className="t-cap">Aportaciones pagadas</span></div>
            <span className="t-h2 text-brand-700">{count}</span>
          </div>
          <section className="ui-card">
            <div className="flex items-center justify-between">
              <h2 className="t-h3">Últimas aportaciones</h2>
              {detail.recentContributions.length > FIRST && (
                <button className="t-strong text-brand-700" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>{showAll ? 'Ver menos' : 'Ver todas'}</button>
              )}
            </div>
            {rows.length === 0 ? <p className="t-body">Aún no hay aportaciones pagadas.</p> : (
              <ul className="-my-3 divide-y divide-line">
                {rows.map((c, i) => (
                  <li key={`${c.paidAt}-${i}`} className="flex items-start gap-3 py-3">
                    <Avatar name={c.name} size={36} />
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2"><span className="t-strong truncate">{c.name}</span><Chip kind="paid">Pagado</Chip></div>
                        <Money amount={c.amount} className="t-strong" />
                      </div>
                      {c.message && <span className="t-cap">{c.message}</span>}
                      <span className="t-cap !text-ink-400">{shortDate.format(new Date(c.paidAt))}</span>
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
          <Button variant="secondary" onClick={() => exportCsv(g.title, detail.recentContributions)} disabled={!detail.recentContributions.length}>
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
            <Button variant="secondary" size="sm" onClick={() => exportCsv(g.title, detail.recentContributions)} disabled={!detail.recentContributions.length}>
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
          <div className="flex items-center justify-between">
            <Chip kind="paid">Pagadas</Chip>
            <span className="t-h3">{count}</span>
          </div>
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
          {detail.recentContributions.length > FIRST && (
            <button className="t-strong text-brand-700" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
              {showAll ? 'Ver menos' : 'Ver todas'}
            </button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="t-body border-t border-line p-8 text-center">Aún no hay aportaciones pagadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table">
              <thead>
                <tr><th scope="col">Nombre</th><th scope="col">Mensaje</th><th scope="col">Monto</th><th scope="col">Estado</th><th scope="col">Fecha</th></tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={`${c.paidAt}-${i}`}>
                    <td><div className="flex items-center gap-2.5"><Avatar name={c.name} size={32} /><span className="t-strong">{c.name}</span></div></td>
                    <td className="max-w-[260px] text-ink-700">{c.message || '—'}</td>
                    <td className="t-strong"><Money amount={c.amount} /></td>
                    <td><Chip kind="paid">Pagado</Chip></td>
                    <td className="text-ink-700">{shortDate.format(new Date(c.paidAt))}</td>
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

/** Descarga las aportaciones visibles como CSV (se genera en el navegador, con BOM para Excel). */
function exportCsv(title: string, rows: RecentContribution[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    ['Nombre', 'Mensaje', 'Monto', 'Pagada (UTC)'].join(','),
    ...rows.map((c) => [esc(c.name), esc(c.message ?? ''), c.amount.toFixed(2), c.paidAt].join(',')),
  ]
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `aportaciones-${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}
