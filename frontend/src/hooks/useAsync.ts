import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Hook sencillo para cargar datos: devuelve { data, error, loading, reload }.
 * `deps` funciona como en useEffect: si cambian, vuelve a cargar.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn

  // `silent` = recargar sin mostrar el spinner (útil tras una acción).
  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      setData(await fnRef.current())
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, deps)

  return { data, setData, error, loading, reload }
}
