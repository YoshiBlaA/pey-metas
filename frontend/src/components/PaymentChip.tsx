import type { ContributionStatus } from '../api'
import { Chip } from './StatusBadge'

/** Chip de estado del pago CoDi: Pendiente / Pagado / Expirado. */
export function PaymentChip({ status }: { status: ContributionStatus }) {
  if (status === 'PAID') return <Chip kind="paid">Pagado</Chip>
  if (status === 'EXPIRED') return <Chip kind="expired">Expirado</Chip>
  return <Chip kind="pending">Pendiente</Chip>
}
