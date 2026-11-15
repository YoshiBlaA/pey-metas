// Guardamos el QR en sessionStorage para que, si el usuario recarga la página de pago,
// no pierda el código (la respuesta del POST solo llega una vez).
import type { ContributionCreatedResponse } from '../api'

const key = (numRef: string) => `pey.payment.${numRef}`

export function savePayment(p: ContributionCreatedResponse) {
  sessionStorage.setItem(key(p.numRef), JSON.stringify(p))
}

export function loadPayment(numRef: string): ContributionCreatedResponse | null {
  try {
    const raw = sessionStorage.getItem(key(numRef))
    return raw ? (JSON.parse(raw) as ContributionCreatedResponse) : null
  } catch {
    return null
  }
}
