// Endpoints de administración. Todos (menos login) mandan el token Bearer.
import { request } from './client'
import type {
  AdminContribution,
  AdminMe,
  ContributionStats,
  ContributionStatus,
  GoalAdminResponse,
  GoalRequest,
  GoalStatus,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from './types'

export const realAdminApi = {
  login: (body: LoginRequest) => request<LoginResponse>('/api/auth/login', { method: 'POST', body }),

  /** Crea una cuenta (cada admin maneja solo sus metas); regresa el token como el login. */
  register: (body: RegisterRequest) => request<LoginResponse>('/api/auth/register', { method: 'POST', body }),

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

  /** Aportaciones en cualquier estado, más nuevas primero. */
  listContributions: (opts: { goalId?: number; status?: ContributionStatus; limit?: number } = {}) =>
    request<AdminContribution[]>('/api/admin/contributions', { auth: true, query: opts }),

  /** Pagadas / pendientes / expiradas y lo pagado en 7 días (sin goalId = todas las metas). */
  contributionStats: (goalId?: number) =>
    request<ContributionStats>('/api/admin/contributions/stats', { auth: true, query: { goalId } }),
}

export type AdminApi = typeof realAdminApi
