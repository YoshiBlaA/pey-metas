interface Props {
  /** Porcentaje 0-100 (el backend ya lo manda calculado). */
  value: number
  size?: 'sm' | 'lg'
  achieved?: boolean
  label?: string
  className?: string
}

/** Barra de progreso del Figma (8px, grande 14px), accesible con role="progressbar". */
export function ProgressBar({ value, size = 'sm', achieved = false, label = 'Progreso de la meta', className = '' }: Props) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`ui-bar ${size === 'lg' ? 'lg' : ''} ${achieved ? 'done' : ''} ${className}`}
    >
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}
