// Los listados (público y admin) todavía no traen cuántas aportaciones pagadas tiene cada meta.
// Mientras tanto lo tomamos del detalle público (GET /api/public/goals/{id}?recent=1) en paralelo.
// TEMPORAL: hay una petición en docs/PETICIONES.md para que el backend agregue
// `paidContributionsCount` al listado. Si ya viene en la respuesta, se usa directo y no se pide nada.
import { useEffect, useState } from 'react'
import { publicApi } from '../api'

type WithCount = { id: number; paidContributionsCount?: number }

export function useGoalCounts(goals: WithCount[] | null | undefined): Record<number, number | null> {
  const [fetched, setFetched] = useState<Record<number, number | null>>({})
  const missing = (goals ?? []).filter((g) => g.paidContributionsCount === undefined).map((g) => g.id)
  const key = missing.join(',')

  useEffect(() => {
    if (!missing.length) return
    let alive = true
    Promise.all(
      missing.map((id) =>
        publicApi.getGoal(id, 1).then((g) => [id, g.paidContributionsCount] as const).catch(() => [id, null] as const),
      ),
    ).then((pairs) => alive && setFetched((prev) => ({ ...prev, ...Object.fromEntries(pairs) })))
    return () => {
      alive = false
    }
  }, [key])

  const counts: Record<number, number | null> = { ...fetched }
  for (const g of goals ?? []) if (g.paidContributionsCount !== undefined) counts[g.id] = g.paidContributionsCount
  return counts
}
