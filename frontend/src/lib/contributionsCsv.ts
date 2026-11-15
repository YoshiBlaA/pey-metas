import type { AdminContribution } from '../api'

const STATUS_TEXT = { PAID: 'Pagado', PENDING: 'Pendiente', EXPIRED: 'Expirado' } as const

/** Descarga aportaciones como CSV (se genera en el navegador, con BOM para Excel). */
export function exportCsv(title: string, rows: AdminContribution[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = [
    ['Nombre', 'Mensaje', 'Monto', 'Estado', 'Creada (UTC)', 'Pagada (UTC)', 'Referencia', 'Meta'].join(','),
    ...rows.map((c) =>
      [esc(c.name), esc(c.message ?? ''), c.amount.toFixed(2), STATUS_TEXT[c.status], c.createdAt, c.paidAt ?? '', c.numRef, esc(c.goalTitle)].join(','),
    ),
  ]
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `aportaciones-${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}
