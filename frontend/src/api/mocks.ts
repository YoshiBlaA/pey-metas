// Mocks en memoria para trabajar sin backend (VITE_USE_MOCKS=true).
// Imitan los contratos y errores reales. Una aportación pasa a PAID ~15 s después
// de crearse, para poder probar todo el flujo del QR.
import { ApiError, triggerUnauthorized } from './client'
import type { AdminApi } from './adminApi'
import type { PublicApi } from './publicApi'
import { readStoredSession } from '../lib/authStorage'
import type {
  AdminContribution,
  ContributionStatus,
  GoalAdminResponse,
  GoalRequest,
  GoalStatus,
  RecentContribution,
} from './types'

const PAY_AFTER_MS = 15_000
const QR_TTL_S = 1200 // vigencia real del QR en Pey: 20 minutos
/** Cuentas de demo: cada una ve y maneja solo sus metas. Las nuevas se agregan con "Crear cuenta". */
interface MockUser {
  id: number
  username: string
  name: string | null
  password: string
}
const users: MockUser[] = [
  { id: 1, username: 'admin', name: 'Pey Metas (demo)', password: 'admin123' },
  { id: 2, username: 'huellitas@demo.mx', name: 'Rescate Huellitas', password: 'demo1234' },
]

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

/** Aportación pagada del mock: lo público + la referencia que ve el admin. */
type MockPaid = RecentContribution & { ref: string }

interface MockGoal extends GoalAdminResponse {
  /** Cuenta dueña de la meta (no viaja en las respuestas, igual que en el backend). */
  ownerId: number
  contributions: MockPaid[]
}

let refSeq = 4_810_000
const nextRef = () => String(((refSeq++ * 7) % 8_999_999) + 1_000_000)
const withRefs = (list: RecentContribution[]): MockPaid[] => list.map((c) => ({ ...c, ref: nextRef() }))
const toRecent = ({ ref: _r, ...c }: MockPaid): RecentContribution => c

function makeGoal(
  id: number,
  title: string,
  description: string,
  targetAmount: number,
  contributions: RecentContribution[],
  status: GoalStatus = 'OPEN',
  presetAmounts = [50, 100, 200, 500],
  organizer: string | null = null,
  city: string | null = null,
): MockGoal {
  const raisedAmount = round2(contributions.reduce((s, c) => s + c.amount, 0))
  return {
    id,
    title,
    description,
    organizer,
    city,
    targetAmount,
    raisedAmount,
    percentage: Math.min(100, Math.floor((raisedAmount / targetAmount) * 100)),
    status,
    presetAmounts,
    createdAt: minutesAgo(60 * 24 * 12),
    updatedAt: minutesAgo(30),
    ownerId: 1,
    contributions: withRefs(contributions),
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
    paidAt: minutesAgo(startMinutes + i * 160),
  }))
}

let nextGoalId = 6
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
    'OPEN',
    [50, 100, 200, 500],
    'Familia Ramírez',
    'Puebla, Pue.',
  ),
  makeGoal(
    2,
    'Medicamentos para Don Ramón',
    'Don Ramón necesita su tratamiento de los próximos tres meses. Lo que juntemos va directo a la farmacia.',
    8000,
    filler(41, 4180, 20),
    'OPEN',
    [100, 250, 500],
    'Vecinos de la colonia Centro',
    'Tlaxcala, Tlax.',
  ),
  makeGoal(
    3,
    'Útiles para la Escuela Benito Juárez',
    'Paquetes de útiles para 60 niños de primaria en Tlaxcala.',
    15000,
    filler(120, 15000, 600),
    'CLOSED',
    [50, 100, 200, 500],
    'Sociedad de Padres de Familia',
    'Oaxaca, Oax.',
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
  {
    ...makeGoal(
      5,
      'Rescate animal Huellitas',
      'Vacunas, esterilizaciones y alimento para 40 perritos del refugio.',
      10000,
      filler(19, 2350, 45),
      'OPEN',
      [50, 100, 200],
      'Rescate Huellitas',
      'Cholula, Pue.',
    ),
    ownerId: 2,
  },
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
  /** Datos de ejemplo: nunca se pagan solos. */
  seeded?: boolean
}
const contributions = new Map<string, MockContribution>()

/** QR sin pagar de ejemplo (para el admin): pendientes vigentes y expirados. */
function seedUnpaid(goalId: number, pending: number, expired: number) {
  const now = Date.now()
  const names = ['Carlos M.', 'Anónimo', 'Jorge R.', 'Paty', 'Anónimo', 'Luis F.']
  for (let i = 0; i < pending + expired; i++) {
    const isPending = i < pending
    const createdAt = isPending ? now - (4 + i * 3) * 60_000 : now - (70 + i * 190) * 60_000
    const numRef = nextRef()
    contributions.set(numRef, {
      numRef,
      goalId,
      amount: [100, 50, 200, 80][i % 4],
      name: names[i % names.length],
      message: i % 3 === 1 ? 'Échale ganas 💪' : null,
      createdAt,
      expiresAt: new Date(createdAt + QR_TTL_S * 1000).toISOString(),
      status: isPending ? 'PENDING' : 'EXPIRED',
      paidAt: null,
      seeded: true,
    })
  }
}
seedUnpaid(1, 2, 9)
seedUnpaid(2, 1, 3)
seedUnpaid(4, 0, 2)

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
  const { contributions: _c, createdAt: _a, updatedAt: _u, ownerId: _o, ...summary } = g
  return { ...summary, presetAmounts: [...g.presetAmounts] }
}
function toAdmin(g: MockGoal): GoalAdminResponse {
  const { contributions: _c, ownerId: _o, ...rest } = g
  return { ...rest, presetAmounts: [...g.presetAmounts] }
}
const hasMax2Decimals = (n: number) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6

/** Simula el paso del tiempo: PENDING -> PAID (a los 15 s) o EXPIRED (al vencer). */
function advance(c: MockContribution) {
  if (c.status !== 'PENDING') return
  const now = Date.now()
  if (now >= Date.parse(c.expiresAt)) {
    c.status = 'EXPIRED'
  } else if (!mockNeverPays() && !c.seeded && now - c.createdAt >= PAY_AFTER_MS) {
    c.status = 'PAID'
    c.paidAt = new Date().toISOString()
    const g = findGoal(c.goalId)
    g.contributions.unshift({ name: c.name, amount: c.amount, message: c.message, paidAt: c.paidAt, ref: c.numRef })
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
  if ((body.organizer?.length ?? 0) > 100) errors.push({ field: 'organizer', message: 'Máximo 100 caracteres' })
  if ((body.city?.length ?? 0) > 100) errors.push({ field: 'city', message: 'Máximo 100 caracteres' })
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
      recentContributions: g.contributions.slice(0, Math.min(50, Math.max(1, recent))).map(toRecent),
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

/** Todas las aportaciones como las ve el admin (pagadas + QR sin pagar), más nuevas primero. */
function allAdminContributions(ownerId: number): AdminContribution[] {
  contributions.forEach(advance)
  let id = 1
  const out: AdminContribution[] = []
  const mine = new Set(goals.filter((g) => g.ownerId === ownerId).map((g) => g.id))
  for (const g of goals.filter((x) => mine.has(x.id))) {
    for (const c of g.contributions) {
      const created = Date.parse(c.paidAt) - 90_000
      out.push({
        id: id++,
        numRef: c.ref,
        goalId: g.id,
        goalTitle: g.title,
        name: c.name,
        anonymous: c.name === 'Anónimo',
        message: c.message,
        amount: c.amount,
        status: 'PAID',
        createdAt: new Date(created).toISOString(),
        expiresAt: new Date(created + QR_TTL_S * 1000).toISOString(),
        paidAt: c.paidAt,
      })
    }
  }
  for (const c of contributions.values()) {
    if (c.status === 'PAID' || !mine.has(c.goalId)) continue // pagadas ya están en g.contributions
    out.push({
      id: id++,
      numRef: c.numRef,
      goalId: c.goalId,
      goalTitle: goals.find((x) => x.id === c.goalId)?.title ?? '',
      name: c.name,
      anonymous: c.name === 'Anónimo',
      message: c.message,
      amount: c.amount,
      status: c.status,
      createdAt: new Date(c.createdAt).toISOString(),
      expiresAt: c.expiresAt,
      paidAt: null,
    })
  }
  return out.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

// --- API admin simulada ---------------------------------------------------------------
const tokenFor = (u: MockUser) => `mock-token-${u.id}`

/** Cuenta de la sesión guardada por AuthContext (localStorage o sessionStorage); si no, 401. */
function currentUser(): MockUser {
  const token = readStoredSession()?.token ?? null
  const user = users.find((u) => tokenFor(u) === token)
  if (!user) {
    triggerUnauthorized()
    throw new ApiError(401, 'Tu sesión expiró. Inicia sesión de nuevo.')
  }
  return user
}

/** Meta del usuario; si es de otra cuenta responde 404 igual que el backend. */
function ownGoal(id: number): MockGoal {
  const me = currentUser()
  const g = findGoal(id)
  if (g.ownerId !== me.id) throw new ApiError(404, 'Meta no encontrada')
  return g
}

export const mockAdminApi: AdminApi = {
  async login({ username, password }) {
    await latency()
    const u = users.find((x) => x.username === username.trim().toLowerCase() || x.username === username.trim())
    if (!u || u.password !== password) throw new ApiError(401, 'Usuario o contraseña incorrectos')
    return { token: tokenFor(u), tokenType: 'Bearer', expiresIn: 3600 }
  },
  async register({ name, email, password }) {
    await latency()
    const errors: { field: string; message: string }[] = []
    if (!name?.trim()) errors.push({ field: 'name', message: 'El nombre es obligatorio' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim() ?? '')) errors.push({ field: 'email', message: 'Escribe un correo válido' })
    if ((password?.length ?? 0) < 8) errors.push({ field: 'password', message: 'La contraseña debe tener entre 8 y 200 caracteres' })
    if (errors.length) throw new ApiError(400, 'La solicitud tiene datos inválidos', errors)
    const username = email.trim().toLowerCase()
    if (users.some((u) => u.username === username)) throw new ApiError(409, 'Ya existe una cuenta con ese correo')
    const u: MockUser = { id: users.length + 1, username, name: name.trim(), password }
    users.push(u)
    return { token: tokenFor(u), tokenType: 'Bearer', expiresIn: 3600 }
  },
  async me() {
    await latency()
    const u = currentUser()
    return { id: u.id, username: u.username, name: u.name, roles: ['ROLE_ADMIN'] }
  },
  async listGoals(status) {
    await latency()
    const me = currentUser()
    contributions.forEach(advance)
    return goals.filter((g) => g.ownerId === me.id && (!status || g.status === status)).map(toAdmin)
  },
  async getGoal(id) {
    await latency()
    return toAdmin(ownGoal(id))
  },
  async createGoal(body) {
    await latency()
    const me = currentUser()
    validateGoal(body)
    const g = makeGoal(nextGoalId++, body.title.trim(), body.description ?? '', body.targetAmount, [], 'OPEN', body.presetAmounts, body.organizer?.trim() || null, body.city?.trim() || null)
    g.ownerId = me.id
    g.createdAt = g.updatedAt = new Date().toISOString()
    goals.unshift(g)
    return toAdmin(g)
  },
  async updateGoal(id, body) {
    await latency()
    const g = ownGoal(id)
    validateGoal(body)
    Object.assign(g, {
      title: body.title.trim(),
      description: body.description,
      targetAmount: body.targetAmount,
      presetAmounts: body.presetAmounts,
      organizer: body.organizer?.trim() || null,
      city: body.city?.trim() || null,
    })
    recalc(g)
    return toAdmin(g)
  },
  async closeGoal(id) {
    await latency()
    const g = ownGoal(id)
    g.status = 'CLOSED'
    g.updatedAt = new Date().toISOString()
    return toAdmin(g)
  },
  async reopenGoal(id) {
    await latency()
    const g = ownGoal(id)
    if (g.raisedAmount >= g.targetAmount)
      throw new ApiError(422, 'No se puede reabrir: la meta ya alcanzó su objetivo')
    g.status = 'OPEN'
    g.updatedAt = new Date().toISOString()
    return toAdmin(g)
  },
  async listContributions({ goalId, status, limit = 200 } = {}) {
    await latency()
    const me = currentUser()
    return allAdminContributions(me.id)
      .filter((c) => (!goalId || c.goalId === goalId) && (!status || c.status === status))
      .slice(0, Math.max(1, Math.min(1000, limit)))
  },
  async contributionStats(goalId) {
    await latency()
    const me = currentUser()
    const list = allAdminContributions(me.id).filter((c) => !goalId || c.goalId === goalId)
    const weekAgo = Date.now() - 7 * 86_400_000
    const count = (st: ContributionStatus) => list.filter((c) => c.status === st).length
    return {
      paid: count('PAID'),
      pending: count('PENDING'),
      expired: count('EXPIRED'),
      paidAmountLast7Days: round2(
        list.filter((c) => c.status === 'PAID' && Date.parse(c.paidAt!) >= weekAgo).reduce((sum, c) => sum + c.amount, 0),
      ),
    }
  },
}
