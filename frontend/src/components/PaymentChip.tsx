import type { ContributionStatus } from '../api'

const styles: Record<ContributionStatus, { cls: string; dot: string; text: string }> = {
  PENDING: { cls: 'bg-pending-bg text-pending-text', dot: 'bg-pending', text: 'Esperando pago' },
  PAID: { cls: 'bg-brand-100 text-brand-700', dot: 'bg-brand-600', text: 'Pagado' },
  EXPIRED: { cls: 'bg-expired-bg text-expired', dot: 'bg-expired', text: 'Expirado' },
}

/** Chip de estado del pago CoDi. */
export function PaymentChip({ status }: { status: ContributionStatus }) {
  const s = styles[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${s.cls}`}>
      <span className={`size-2 rounded-full ${s.dot} ${status === 'PENDING' ? 'animate-pulse' : ''}`} aria-hidden />
      {s.text}
    </span>
  )
}
