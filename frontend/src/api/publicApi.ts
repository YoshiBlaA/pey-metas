// Endpoints públicos (no requieren login).
import { request } from './client'
import type {
  ContributionCreatedResponse,
  ContributionRequest,
  ContributionStatusResponse,
  GoalPublicDetail,
  GoalPublicSummary,
  GoalStatus,
} from './types'

export const realPublicApi = {
  listGoals: (status?: GoalStatus) =>
    request<GoalPublicSummary[]>('/api/public/goals', { query: { status } }),

  /** recent: cuántas aportaciones recientes traer (1-50). */
  getGoal: (id: number, recent = 10) =>
    request<GoalPublicDetail>(`/api/public/goals/${id}`, { query: { recent } }),

  createContribution: (goalId: number, body: ContributionRequest) =>
    request<ContributionCreatedResponse>(`/api/public/goals/${goalId}/contributions`, {
      method: 'POST',
      body,
    }),

  getContribution: (numRef: string) =>
    request<ContributionStatusResponse>(`/api/public/contributions/${encodeURIComponent(numRef)}`),
}

export type PublicApi = typeof realPublicApi
