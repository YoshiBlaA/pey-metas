import { useEffect, useState } from 'react'

/** true mientras se cumpla la media query (se actualiza al cambiar el tamaño de la ventana). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update) // limpieza
  }, [query])
  return matches
}

/** Breakpoints del diseño: móvil < 768px; columna de 1200px desde 1024px; admin con sidebar desde 1024px. */
export const useIsDesktopWidth = () => useMediaQuery('(min-width: 768px)')
export const useIsAdminDesktop = () => useMediaQuery('(min-width: 1024px)')
