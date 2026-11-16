import type { CSSProperties } from 'react'
import { formatMoney } from '../lib/format'

/** Muestra un monto en pesos mexicanos: <Money amount={9250} /> -> $9,250.00 */
export function Money({ amount, className, style }: { amount: number; className?: string; style?: CSSProperties }) {
  return <span className={`tabular-nums ${className ?? ''}`} style={style}>{formatMoney(amount)}</span>
}
