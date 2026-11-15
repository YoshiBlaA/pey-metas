interface Props {
  /** Porcentaje 0-100 (el backend ya lo manda calculado). */
  value: number
  size?: 'sm' | 'lg'
  achieved?: boolean
  label?: string
}

/** Barra de progreso accesible (role="progressbar" con aria-valuenow). */
export function ProgressBar({ value, size = 'sm', achieved = false, label = 'Progreso de la meta' }: Props) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`w-full overflow-hidden rounded-full bg-track ${size === 'lg' ? 'h-4' : 'h-2'}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${achieved ? 'bg-achieved' : 'bg-brand-600'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
