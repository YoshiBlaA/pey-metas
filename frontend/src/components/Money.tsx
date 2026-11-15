import { formatMoney } from '../lib/format'

/** Muestra un monto en pesos mexicanos: <Money amount={9250} /> -> $9,250.00 */
export function Money({ amount, className }: { amount: number; className?: string }) {
  return <span className={`tabular-nums ${className ?? ''}`}>{formatMoney(amount)}</span>
}
