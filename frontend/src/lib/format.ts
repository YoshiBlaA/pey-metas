// Formatos para México: pesos MXN y fechas en español.
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

/** 9250 -> "$9,250.00" */
export const formatMoney = (amount: number) => mxn.format(amount)

const dateTime = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
/** Fecha ISO UTC del backend -> "15 nov 2026, 11:58" (hora local, 24 h). */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso)).replace('.', '')

const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto', style: 'short' })
const rtfLong = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })
/** Formato corto del diseño: "hace 12 min", "hace 3 h", "ayer". */
export function formatRelative(iso: string, now = Date.now()): string {
  const diffS = Math.round((Date.parse(iso) - now) / 1000)
  const abs = Math.abs(diffS)
  if (abs < 60) return 'hace un momento'
  if (abs < 3600) return rtf.format(Math.round(diffS / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffS / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diffS / 86400), 'day')
  return rtfLong.format(Math.round(diffS / (86400 * 30)), 'month') // en corto saldría "hace 2 m"
}

/** 754 segundos -> "12:34" */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** "Mariana López" -> "ML" (para el avatar de las aportaciones). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase()
}

const amountFmt = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** 12500 -> "12,500.00" (para mostrar un monto dentro de un input). */
export const formatAmountInput = (n: number) => amountFmt.format(n)
