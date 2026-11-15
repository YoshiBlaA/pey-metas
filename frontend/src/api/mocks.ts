// Mocks en memoria para trabajar sin backend (VITE_USE_MOCKS=true).
// Imitan los contratos y errores reales. Una aportación pasa a PAID ~15 s después
// de crearse, para poder probar todo el flujo del QR.
import { ApiError, triggerUnauthorized } from './client'
import type { AdminApi } from './adminApi'
import type { PublicApi } from './publicApi'
import type {
  ContributionStatus,
  GoalAdminResponse,
  GoalRequest,
  GoalStatus,
  RecentContribution,
} from './types'

const PAY_AFTER_MS = 15_000
const QR_TTL_S = 1200 // vigencia real del QR en Pey: 20 minutos
const MOCK_USER = { username: 'admin', password: 'admin123' }

// Solo para probar la pantalla "QR expirado" en modo demo: con
// localStorage['pey.mock.sinPago'] = '1' las aportaciones nunca se pagan y vencen.
const mockNeverPays = () => {
  try {
    return localStorage.getItem('pey.mock.sinPago') === '1'
  } catch {
    return false
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const latency = () => sleep(250 + Math.random() * 350)
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
const round2 = (n: number) => Math.round(n * 100) / 100

interface MockGoal extends GoalAdminResponse {
  contributions: RecentContribution[]
}

function makeGoal(
  id: number,
  title: string,
  description: string,
  targetAmount: number,
  contributions: RecentContribution[],
  status: GoalStatus = 'OPEN',
  presetAmounts = [50, 100, 200, 500],
): MockGoal {
  const raisedAmount = round2(contributions.reduce((s, c) => s + c.amount, 0))
  return {
    id,
    title,
    description,
    targetAmount,
    raisedAmount,
    percentage: Math.min(100, Math.floor((raisedAmount / targetAmount) * 100)),
    status,
    presetAmounts,
    createdAt: minutesAgo(60 * 24 * 12),
    updatedAt: minutesAgo(30),
    contributions,
  }
}

// Genera N aportaciones de relleno con nombres y montos realistas.
const NAMES = ['Mariana L.', 'Anónimo', 'Tío Beto', 'Fer', 'Lupita G.', 'Anónimo', 'Carlos M.', 'Ana Sofía', 'Los Pérez', 'Jorge']
const MSGS = ['¡Mucho éxito! 💚', null, 'Con cariño', '¡Tú puedes!', null, 'Echándole ganas', null]
const AMOUNTS = [50, 100, 200, 150, 500, 100, 80, 250, 300, 120]
function filler(count: number, total: number, startMinutes: number): RecentContribution[] {
  // Montos variados; el último ajusta para que la suma dé exactamente `total`.
  const amounts = Array.from({ length: count }, (_, i) => AMOUNTS[i % AMOUNTS.length])
  const scale = total / amounts.reduce((a, b) => a + b, 0)
  const scaled = amounts.map((a) => Math.max(10, Math.round((a * scale) / 10) * 10))
  scaled[count - 1] = round2(total - scaled.slice(0, -1).reduce((a, b) => a + b, 0))
  return Array.from({ length: count }, (_, i) => ({
    name: NAMES[i % NAMES.length],
    amount: scaled[i],
    message: MSGS[i % MSGS.length],
    paidAt: minutesAgo(startMinutes + i * 47),
  }))
}

let nextGoalId = 5
const goals: MockGoal[] = [
  makeGoal(
    1,
    'Laptop para Sofía',
    'Sofía entró a Ingeniería en la BUAP y necesita una laptop para sus clases. Cada aportación la acerca a empezar el semestre con todo.',
    12500,
    [
      { name: 'Mariana L.', amount: 200, message: '¡Mucho éxito en la uni, Sofía! 💚', paidAt: minutesAgo(12) },
      { name: 'Anónimo', amount: 500, message: null, paidAt: minutesAgo(55) },
      { name: 'Tío Beto', amount: 1000, message: 'Para que saques puro 10', paidAt: minutesAgo(180) },
      ...filler(83, 7550, 300),
    ],
  ),
  makeGoal(
    2,
    'Medicamentos para Don Ramón',
    'Don Ramón necesita su tratamiento de los próximos tres meses. Lo que juntemos va directo a la farmacia.',
    8000,
    filler(41, 4180, 20),
    'OPEN',
    [100, 250, 500],
  ),
  makeGoal(
    3,
    'Útiles para la Escuela Benito Juárez',
    'Paquetes de útiles para 60 niños de primaria en Tlaxcala.',
    15000,
    filler(120, 15000, 600),
    'CLOSED',
  ),
  makeGoal(
    4,
    'Viaje de fin de curso 3°B',
    'Ayúdanos a que todo el grupo pueda ir a Puebla al museo y al Africam Safari.',
    20000,
    filler(9, 2350.5, 90),
    'OPEN',
    [20, 50, 100, 200, 300],
  ),
]

interface MockContribution {
  numRef: string
  goalId: number
  amount: number
  name: string
  message: string | null
  createdAt: number
  expiresAt: string
  status: ContributionStatus
  paidAt: string | null
}
const contributions = new Map<string, MockContribution>()

// --- helpers ------------------------------------------------------------------------
function findGoal(id: number): MockGoal {
  const g = goals.find((x) => x.id === id)
  if (!g) throw new ApiError(404, 'Meta no encontrada')
  return g
}
function recalc(g: MockGoal) {
  g.raisedAmount = round2(g.contributions.reduce((s, c) => s + c.amount, 0))
  g.percentage = Math.min(100, Math.floor((g.raisedAmount / g.targetAmount) * 100))
  g.updatedAt = new Date().toISOString()
}
function toSummary(g: MockGoal) {
  // Igual que el backend real: el resumen NO trae paidContributionsCount.
  const { contributions: _c, createdAt: _a, updatedAt: _u, ...summary } = g
  return { ...summary, presetAmounts: [...g.presetAmounts] }
}
function toAdmin(g: MockGoal): GoalAdminResponse {
  const { contributions: _c, ...rest } = g
  return { ...rest, presetAmounts: [...g.presetAmounts] }
}
const hasMax2Decimals = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6

/** Simula el paso del tiempo: PENDING -> PAID (a los 15 s) o EXPIRED (al vencer). */
function advance(c: MockContribution) {
  if (c.status !== 'PENDING') return
  const now = Date.now()
  if (now >= Date.parse(c.expiresAt)) {
    c.status = 'EXPIRED'
  } else if (!mockNeverPays() && now - c.createdAt >= PAY_AFTER_MS) {
    c.status = 'PAID'
    c.paidAt = new Date().toISOString()
    const g = findGoal(c.goalId)
    g.contributions.unshift({ name: c.name, amount: c.amount, message: c.message, paidAt: c.paidAt })
    recalc(g)
  }
}

function validateGoal(body: GoalRequest) {
  const errors: { field: string; message: string }[] = []
  if (!body.title?.trim()) errors.push({ field: 'title', message: 'El título es obligatorio' })
  else if (body.title.length > 150) errors.push({ field: 'title', message: 'Máximo 150 caracteres' })
  if (body.description && body.description.length > 2000)
    errors.push({ field: 'description', message: 'Máximo 2000 caracteres' })
  if (!(body.targetAmount > 0)) errors.push({ field: 'targetAmount', message: 'Debe ser mayor a 0' })
  if (body.presetAmounts.length > 12) errors.push({ field: 'presetAmounts', message: 'Máximo 12 montos' })
  if (body.presetAmounts.some((p) => !(p > 0)))
    errors.push({ field: 'presetAmounts', message: 'Cada monto debe ser mayor a 0' })
  if (errors.length) throw new ApiError(400, 'La solicitud tiene datos inválidos', errors)
}

/** Payload de demostración con la forma del de CoDi (ver docs.pey.mx › Display CoDi QR). */
export const DEMO_MARK = 'DEMO-NO-PAGABLE'
function demoQrString(numRef: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const rnd = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * 64)]).join('')
  return JSON.stringify({
    TYP: 20,
    v: { DEV: '00000000000000000000/0' },
    ic: { IDC: `demo${numRef}`, SER: 0, ENC: `${DEMO_MARK}:${rnd(300)}=` },
    CRY: `${DEMO_MARK}:${rnd(40)}=`,
  })
}

// --- API pública simulada -------------------------------------------------------------
export const mockPublicApi: PublicApi = {
  async listGoals(status) {
    await latency()
    return goals.filter((g) => !status || g.status === status).map(toSummary)
  },

  async getGoal(id, recent = 10) {
    await latency()
    contributions.forEach(advance)
    const g = findGoal(id)
    return {
      ...toSummary(g),
      paidContributionsCount: g.contributions.length,
      recentContributions: g.contributions.slice(0, Math.min(50, Math.max(1, recent))),
    }
  },

  async createContribution(goalId, body) {
    await latency()
    const g = findGoal(goalId)
    if (g.status === 'CLOSED') throw new ApiError(409, 'La meta ya está cerrada y no acepta aportaciones')
    const errors: { field: string; message: string }[] = []
    if (!(body.amount > 0)) errors.push({ field: 'amount', message: 'El monto debe ser mayor a 0' })
    else if (!hasMax2Decimals(body.amount)) errors.push({ field: 'amount', message: 'Máximo 2 decimales' })
    if (!body.anonymous && !body.displayName?.trim())
      errors.push({ field: 'displayName', message: 'El nombre es obligatorio si no es anónima' })
    if ((body.displayName?.length ?? 0) > 60) errors.push({ field: 'displayName', message: 'Máximo 60 caracteres' })
    if ((body.message?.length ?? 0) > 200) errors.push({ field: 'message', message: 'Máximo 200 caracteres' })
    if (errors.length) throw new ApiError(400, 'La solicitud tiene datos inválidos', errors)

    const numRef = String(Math.floor(1_000_000 + Math.random() * 8_999_999))
    const expiresAt = new Date(Date.now() + QR_TTL_S * 1000).toISOString()
    contributions.set(numRef, {
      numRef,
      goalId,
      amount: body.amount,
      name: body.anonymous ? 'Anónimo' : body.displayName!.trim(),
      message: body.message,
      createdAt: Date.now(),
      expiresAt,
      status: 'PENDING',
      paidAt: null,
    })
    return {
      numRef,
      goalId,
      amount: body.amount,
      status: 'PENDING',
      expiresAt,
      codiQrId: `demo${numRef}`,
      // Misma FORMA que el qrString real de Pey/CoDi (TYP, v.DEV, ic.IDC/SER/ENC, CRY), pero marcado
      // como DEMO y con datos cifrados falsos: ninguna app de banco lo va a aceptar como cobro.
      qrString: demoQrString(numRef),
      qrImage: null,
    }
  },

  async getContribution(numRef) {
    await latency()
    const c = contributions.get(numRef)
    if (!c) throw new ApiError(404, 'Aportación no encontrada')
    advance(c)
    return { numRef: c.numRef, goalId: c.goalId, status: c.status, amount: c.amount, expiresAt: c.expiresAt, paidAt: c.paidAt }
  },
}

// --- API admin simulada ---------------------------------------------------------------
const MOCK_TOKEN = 'mock-token-pey'
function checkToken() {
  // Leemos el token que guardó AuthContext (misma clave de localStorage).
  const raw = localStorage.getItem('pey.admin.session')
  const token = raw ? (JSON.parse(raw) as { token?: string }).token : null
  if (token !== MOCK_TOKEN) {
    triggerUnauthorized()
    throw new ApiError(401, 'Tu sesión expiró. Inicia sesión de nuevo.')
  }
}

export const mockAdminApi: AdminApi = {
  async login({ username, password }) {
    await latency()
    if (username !== MOCK_USER.username || password !== MOCK_USER.password)
      throw new ApiError(401, 'Usuario o contraseña incorrectos')
    return { token: MOCK_TOKEN, tokenType: 'Bearer', expiresIn: 3600 }
  },
  async me() {
    await latency()
    checkToken()
    return { username: MOCK_USER.username, roles: ['ROLE_ADMIN'] }
  },
  async listGoals(status) {
    await latency()
    checkToken()
    contributions.forEach(advance)
    return goals.filter((g) => !status || g.status === status).map(toAdmin)
  },
  async getGoal(id) {
    await latency()
    checkToken()
    return toAdmin(findGoal(id))
  },
  async createGoal(body) {
    await latency()
    checkToken()
    validateGoal(body)
    const g = makeGoal(nextGoalId++, body.title.trim(), body.description ?? '', body.targetAmount, [], 'OPEN', body.presetAmounts)
    g.createdAt = g.updatedAt = new Date().toISOString()
    goals.unshift(g)
    return toAdmin(g)
  },
  async updateGoal(id, body) {
    await latency()
    checkToken()
    validateGoal(body)
    const g = findGoal(id)
    Object.assign(g, { title: body.title.trim(), description: body.description, targetAmount: body.targetAmount, presetAmounts: body.presetAmounts })
    recalc(g)
    return toAdmin(g)
  },
  async closeGoal(id) {
    await latency()
    checkToken()
    const g = findGoal(id)
    g.status = 'CLOSED'
    g.updatedAt = new Date().toISOString()
    return toAdmin(g)
  },
  async reopenGoal(id) {
    await latency()
    checkToken()
    const g = findGoal(id)
    if (g.raisedAmount >= g.targetAmount)
      throw new ApiError(422, 'No se puede reabrir: la meta ya alcanzó su objetivo')
    g.status = 'OPEN'
    g.updatedAt = new Date().toISOString()
    return toAdmin(g)
  },
}
