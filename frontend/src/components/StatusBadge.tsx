import type { GoalStatus } from '../api'

/**
 * Chip de estado de la meta: "Abierta" (verde), "Lograda" (índigo) o "Cerrada" (gris).
 * En lo público CLOSED siempre es "Lograda". En admin pasamos `percentage` para distinguir
 * una meta cerrada a mano antes de llegar al 100 %.
 */
export function StatusBadge({ status, percentage }: { status: GoalStatus; percentage?: number }) {
  const kind = status === 'OPEN' ? 'open' : percentage !== undefined && percentage < 100 ? 'closed' : 'achieved'
  const s = {
    open: { cls: 'bg-brand-100 text-brand-700', dot: 'bg-brand-600', text: 'Abierta' },
    achieved: { cls: 'bg-achieved-50 text-achieved', dot: 'bg-achieved', text: 'Lograda' },
    closed: { cls: 'bg-closed text-ink-700', dot: 'bg-ink-400', text: 'Cerrada' },
  }[kind]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.text}
    </span>
  )
}
