// Utilidades para guardar/compartir el QR como imagen PNG.

/** PNG base64 (sin prefijo) -> Blob. */
function base64ToBlob(b64: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'image/png' })
}

/** Obtiene el PNG: usa el de Pey (qrImage) si existe; si no, el canvas que dibujamos. */
export async function getQrPng(qrImage: string | null | undefined, canvas: HTMLCanvasElement | null): Promise<Blob> {
  if (qrImage) return base64ToBlob(qrImage)
  if (!canvas) throw new Error('El QR aún no está listo')
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), 'image/png'),
  )
}

export const qrFileName = (numRef: string) => `pey-codi-${numRef}.png`

/** Descarga el PNG con un <a download> temporal. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** ¿El navegador puede compartir este archivo con la hoja nativa (WhatsApp, Fotos, etc.)? */
export function canShareFile(file: File): boolean {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}
