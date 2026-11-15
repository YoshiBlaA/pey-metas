// Tipos que reflejan EXACTAMENTE los DTOs del backend (rama main de pey_backend).
// Los montos (BigDecimal) llegan como number y las fechas (Instant) como string ISO en UTC.

export type GoalStatus = 'OPEN' | 'CLOSED'
export type ContributionStatus = 'PENDING' | 'PAID' | 'EXPIRED'

/** Error estándar del backend (ErrorResponse). */
export interface FieldError {
  field: string
  message: string
}
export interface ErrorResponse {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  errors?: FieldError[]
}

/** GET /api/public/goals */
export interface GoalPublicSummary {
  id: number
  title: string
  description: string | null
  /** Quien organiza la meta (opcional). */
  organizer: string | null
  /** Ciudad (opcional). */
  city: string | null
  targetAmount: number
  raisedAmount: number
  /** Entero 0-100, ya calculado por el backend. */
  percentage: number
  status: GoalStatus
  presetAmounts: number[]
  /**
   * Aún NO viene en el listado (petición en docs/PETICIONES.md). Opcional para que el front
   * lo use en cuanto el backend lo agregue; en el detalle sí viene siempre.
   */
  paidContributionsCount?: number
}

export interface RecentContribution {
  /** Ya viene como "Anónimo" cuando la aportación es anónima. */
  name: string
  amount: number
  message: string | null
  paidAt: string
}

/** GET /api/public/goals/{id}?recent=N */
export interface GoalPublicDetail extends GoalPublicSummary {
  paidContributionsCount: number
  recentContributions: RecentContribution[]
}

/** POST /api/public/goals/{goalId}/contributions (body) */
export interface ContributionRequest {
  amount: number
  displayName: string | null
  anonymous: boolean
  message: string | null
}

/** Respuesta 201 al crear una aportación: trae el QR de CoDi. */
export interface ContributionCreatedResponse {
  numRef: string
  goalId: number
  amount: number
  status: ContributionStatus
  expiresAt: string
  codiQrId: string
  /** Contenido del QR; el front lo dibuja con qrcode.react. */
  qrString: string
  /** PNG en base64 (sin prefijo data:) o null. */
  qrImage: string | null
}

/** GET /api/public/contributions/{numRef} */
export interface ContributionStatusResponse {
  numRef: string
  goalId: number
  status: ContributionStatus
  amount: number
  expiresAt: string
  paidAt: string | null
}

/** POST /api/auth/login */
export interface LoginRequest {
  username: string
  password: string
}
export interface LoginResponse {
  token: string
  tokenType: 'Bearer'
  /** Segundos de vigencia del token. */
  expiresIn: number
}

/** GET /api/admin/me */
export interface AdminMe {
  username: string
  roles: string[]
}

/** Body de POST/PUT /api/admin/goals */
export interface GoalRequest {
  title: string
  description: string | null
  targetAmount: number
  presetAmounts: number[]
  organizer: string | null
  city: string | null
}

/** Respuesta de los endpoints admin de metas. */
export interface GoalAdminResponse extends GoalPublicSummary {
  createdAt: string
  updatedAt: string
}

/** GET /api/admin/contributions: aportación en cualquier estado (un PENDING vencido llega como EXPIRED). */
export interface AdminContribution {
  id: number
  /** Referencia numérica del cobro en Pey/CoDi. */
  numRef: string
  goalId: number
  goalTitle: string
  /** Ya viene como "Anónimo" cuando corresponde. */
  name: string
  anonymous: boolean
  message: string | null
  amount: number
  status: ContributionStatus
  createdAt: string
  expiresAt: string
  paidAt: string | null
}

/** GET /api/admin/contributions/stats */
export interface ContributionStats {
  paid: number
  pending: number
  expired: number
  /** Suma pagada en los últimos 7 días (MXN). */
  paidAmountLast7Days: number
}
