// Formatos para México: pesos MXN y fechas en español.
const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

/** 9250 -> "$9,250.00" */
export const formatMoney = (amount: number) => mxn.format(amount)

const dateTime = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
/** Fecha ISO UTC del backend -> fecha local legible. */
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))

const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })
/** "hace 12 minutos", "ayer", etc. */
export function formatRelative(iso: string, now = Date.now()): string {
  const diffS = Math.round((Date.parse(iso) - now) / 1000)
  const abs = Math.abs(diffS)
  if (abs < 60) return 'hace un momento'
  if (abs < 3600) return rtf.format(Math.round(diffS / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffS / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diffS / 86400), 'day')
  return rtf.format(Math.round(diffS / (86400 * 30)), 'month')
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
