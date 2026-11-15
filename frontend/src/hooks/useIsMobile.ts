import { useEffect, useState } from 'react'

// userAgentData aún no está en los tipos de TypeScript de todos los navegadores.
type NavigatorUAData = Navigator & { userAgentData?: { mobile?: boolean } }

const NARROW = '(max-width: 767px)'
// Pantalla táctil "gruesa" (dedo) y de tamaño tablet o menor.
const TOUCH_TABLET = '(pointer: coarse) and (max-width: 1024px)'

/** Permite forzar la vista con ?vista=movil o ?vista=escritorio (útil para probar). */
function forcedView(): boolean | null {
  const v = new URLSearchParams(window.location.search).get('vista')
  if (v === 'movil') return true
  if (v === 'escritorio') return false
  return null
}

function detect(): boolean {
  const forced = forcedView()
  if (forced !== null) return forced
  if ((navigator as NavigatorUAData).userAgentData?.mobile === true) return true
  return window.matchMedia(NARROW).matches || window.matchMedia(TOUCH_TABLET).matches
}

/**
 * ¿Estamos en un celular/tablet? Combina ancho de pantalla, tipo de puntero (dedo vs mouse)
 * y navigator.userAgentData.mobile. Se recalcula si cambia el tamaño o la orientación.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(detect)

  useEffect(() => {
    const queries = [window.matchMedia(NARROW), window.matchMedia(TOUCH_TABLET)]
    const update = () => setIsMobile(detect())
    queries.forEach((q) => q.addEventListener('change', update))
    return () => queries.forEach((q) => q.removeEventListener('change', update)) // limpieza
  }, [])

  return isMobile
}
