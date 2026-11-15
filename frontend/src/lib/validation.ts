// Validaciones del lado del front. Son LAS MISMAS reglas que aplica el backend,
// así el usuario ve el error antes de enviar (el backend vuelve a validar de todos modos).

export type Errors<K extends string> = Partial<Record<K, string>>

/** Convierte el texto de un input ("1,250.5") a número, o null si no es válido. */
export function parseAmount(text: string): number | null {
  const clean = text.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d+)?$/.test(clean)) return null
  return Number(clean)
}

export const hasMax2Decimals = (text: string) => !/\.\d{3,}/.test(text.replace(/[$,\s]/g, ''))

export const LIMITS = {
  displayName: 60,
  message: 200,
  title: 150,
  description: 2000,
  presets: 12,
} as const

export interface ContributionForm {
  amountText: string
  displayName: string
  anonymous: boolean
  message: string
}

export function validateContribution(f: ContributionForm): Errors<'amount' | 'displayName' | 'message'> {
  const e: Errors<'amount' | 'displayName' | 'message'> = {}
  const amount = parseAmount(f.amountText)
  if (amount === null) e.amount = f.amountText.trim() ? 'Escribe un monto válido' : 'Elige o escribe un monto'
  else if (amount <= 0) e.amount = 'El monto debe ser mayor a $0'
  else if (!hasMax2Decimals(f.amountText)) e.amount = 'Usa máximo 2 decimales'

  if (!f.anonymous && !f.displayName.trim()) e.displayName = 'Escribe tu nombre o apodo, o marca “anónimo”'
  if (f.displayName.length > LIMITS.displayName) e.displayName = `Máximo ${LIMITS.displayName} caracteres`
  if (f.message.length > LIMITS.message) e.message = `Máximo ${LIMITS.message} caracteres`
  return e
}

export interface GoalForm {
  title: string
  description: string
  targetText: string
  presetTexts: string[]
}

export function validateGoal(f: GoalForm): Errors<'title' | 'description' | 'targetAmount' | 'presetAmounts'> {
  const e: Errors<'title' | 'description' | 'targetAmount' | 'presetAmounts'> = {}
  if (!f.title.trim()) e.title = 'El título es obligatorio'
  else if (f.title.length > LIMITS.title) e.title = `Máximo ${LIMITS.title} caracteres`
  if (f.description.length > LIMITS.description) e.description = `Máximo ${LIMITS.description} caracteres`

  const target = parseAmount(f.targetText)
  if (target === null || target <= 0) e.targetAmount = 'El objetivo debe ser mayor a $0'
  else if (!hasMax2Decimals(f.targetText)) e.targetAmount = 'Usa máximo 2 decimales'

  const filled = f.presetTexts.filter((t) => t.trim() !== '')
  if (filled.length > LIMITS.presets) e.presetAmounts = `Máximo ${LIMITS.presets} montos sugeridos`
  else if (filled.some((t) => { const n = parseAmount(t); return n === null || n <= 0 || !hasMax2Decimals(t) }))
    e.presetAmounts = 'Cada monto sugerido debe ser mayor a $0 (máx. 2 decimales)'
  return e
}

export const isEmpty = (e: object) => Object.keys(e).length === 0
