// Guardamos el QR en sessionStorage para que, si el usuario recarga la página de pago,
// no pierda el código (la respuesta del POST solo llega una vez).
import type { ContributionCreatedResponse } from '../api'

/** Respuesta del backend + datos que ya conocemos en el front (para "¡Gracias, Mariana!"). */
export interface StoredPayment extends ContributionCreatedResponse {
  displayName?: string | null
  anonymous?: boolean
  message?: string | null
  goalTitle?: string
}

const key = (numRef: string) => `pey.payment.${numRef}`

export function savePayment(p: StoredPayment) {
  sessionStorage.setItem(key(p.numRef), JSON.stringify(p))
}

export function loadPayment(numRef: string): StoredPayment | null {
  try {
    const raw = sessionStorage.getItem(key(numRef))
    return raw ? (JSON.parse(raw) as StoredPayment) : null
  } catch {
    return null
  }
}
