import { useEffect, useState } from 'react'

/**
 * Segundos que faltan para `expiresAt` (ISO). Se actualiza cada segundo.
 * Calculamos contra el reloj en cada tick (no restamos 1) para no acumular desfase.
 */
export function useCountdown(expiresAt: string | null | undefined): number {
  const target = expiresAt ? Date.parse(expiresAt) : NaN
  const calc = () => (Number.isNaN(target) ? 0 : Math.max(0, Math.round((target - Date.now()) / 1000)))
  const [seconds, setSeconds] = useState(calc)

  useEffect(() => {
    setSeconds(calc())
    const id = window.setInterval(() => setSeconds(calc()), 1000)
    return () => window.clearInterval(id) // limpieza al desmontar o al cambiar expiresAt
  }, [target])

  return seconds
}
