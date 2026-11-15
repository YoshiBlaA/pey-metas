import type { GoalStatus } from '../api'

/**
 * Chip de estado de la meta: "Abierta" (verde), "Lograda" (índigo) o "Cerrada" (gris).
 * En lo público CLOSED siempre es "Lograda". En admin pasamos `percentage` para distinguir
 * una meta cerrada a mano antes de llegar al 100 %.
 */
export function StatusBadge({ status, percentage }: { status: GoalStatus; percentage?: number }) {
  const kind = status === 'OPEN' ? 'open' : percentage !== undefined && percentage < 100 ? 'closed' : 'done'
  const text = { open: 'Abierta', done: 'Lograda', closed: 'Cerrada' }[kind]
  return <Chip kind={kind}>{text}</Chip>
}

export type ChipKind = 'open' | 'paid' | 'done' | 'pending' | 'expired' | 'closed'

/** Chip genérico del sistema de diseño (padding 4/10, 12px 600, punto de 6px). */
export function Chip({ kind, children }: { kind: ChipKind; children: React.ReactNode }) {
  return (
    <span className={`ui-chip ${kind}`}>
      <i aria-hidden />
      {children}
    </span>
  )
}
