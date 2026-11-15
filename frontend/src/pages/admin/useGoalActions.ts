// Acciones de cerrar/reabrir compartidas entre el panel y la vista de progreso.
import { useState } from 'react'
import { adminApi, type GoalAdminResponse } from '../../api'

export function useGoalActions(onDone: (g: GoalAdminResponse) => void) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<unknown>(null)

  async function toggle(goal: GoalAdminResponse) {
    const closing = goal.status === 'OPEN'
    const ok = window.confirm(
      closing
        ? `¿Cerrar la meta “${goal.title}”? Ya no recibirá aportaciones.`
        : `¿Reabrir la meta “${goal.title}”?`,
    )
    if (!ok) return
    setBusyId(goal.id)
    setActionError(null)
    try {
      onDone(closing ? await adminApi.closeGoal(goal.id) : await adminApi.reopenGoal(goal.id))
    } catch (e) {
      setActionError(e) // p. ej. 422 al reabrir una meta que ya alcanzó su objetivo
    } finally {
      setBusyId(null)
    }
  }

  return { toggle, busyId, actionError }
}
