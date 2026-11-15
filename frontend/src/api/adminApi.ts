// Endpoints de administración. Todos (menos login) mandan el token Bearer.
import { request } from './client'
import type { AdminMe, GoalAdminResponse, GoalRequest, GoalStatus, LoginRequest, LoginResponse } from './types'

export const realAdminApi = {
  login: (body: LoginRequest) => request<LoginResponse>('/api/auth/login', { method: 'POST', body }),

  /** Sirve para validar que el token guardado sigue vivo. */
  me: () => request<AdminMe>('/api/admin/me', { auth: true }),

  listGoals: (status?: GoalStatus) =>
    request<GoalAdminResponse[]>('/api/admin/goals', { auth: true, query: { status } }),

  getGoal: (id: number) => request<GoalAdminResponse>(`/api/admin/goals/${id}`, { auth: true }),

  createGoal: (body: GoalRequest) =>
    request<GoalAdminResponse>('/api/admin/goals', { method: 'POST', body, auth: true }),

  updateGoal: (id: number, body: GoalRequest) =>
    request<GoalAdminResponse>(`/api/admin/goals/${id}`, { method: 'PUT', body, auth: true }),

  closeGoal: (id: number) =>
    request<GoalAdminResponse>(`/api/admin/goals/${id}/close`, { method: 'POST', auth: true }),

  /** El backend responde 422 si la meta ya alcanzó su objetivo. */
  reopenGoal: (id: number) =>
    request<GoalAdminResponse>(`/api/admin/goals/${id}/reopen`, { method: 'POST', auth: true }),
}

export type AdminApi = typeof realAdminApi
