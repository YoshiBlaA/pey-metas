import { forwardRef } from 'react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'

/**
 * Parámetros recomendados por Pey (docs.pey.mx › Display CoDi QR):
 * corrección de errores M, margen de 4 módulos (quiet zone), negro puro sobre blanco puro, sin logo.
 * El qrString se codifica TAL CUAL llega del backend: nada de trim, JSON.parse ni JSON.stringify.
 */
export const QR_LEVEL = 'M' as const
export const QR_MARGIN = 4
const FG = '#000000'
const BG = '#FFFFFF'

interface Props {
  qrString: string
  /** PNG base64 de Pey (sin prefijo data:). Si viene, se muestra este en vez de dibujarlo. */
  qrImage?: string | null
  /** Tamaño en px en pantalla (mínimo recomendado 260). */
  size: number
}

/** QR de CoDi para mostrar en pantalla. */
export function CodiQr({ qrString, qrImage, size }: Props) {
  const label = 'Código QR de CoDi para pagar'
  return (
    // Fondo blanco propio: así el margen blanco se ve aunque la tarjeta cambie de color.
    <div className="inline-block rounded-xl bg-white" style={{ width: size, height: size }}>
      {qrImage ? (
        <img
          src={`data:image/png;base64,${qrImage}`}
          alt={label}
          width={size}
          height={size}
          className="size-full"
          style={{ imageRendering: 'pixelated' }}
        />
      ) : (
        <QRCodeSVG
          value={qrString}
          size={size}
          level={QR_LEVEL}
          marginSize={QR_MARGIN}
          fgColor={FG}
          bgColor={BG}
          title={label}
          role="img"
        />
      )}
    </div>
  )
}

/**
 * Canvas oculto en alta resolución, solo para generar el PNG que se descarga o comparte
 * (las apps de banco lo leen desde la galería con "Leer QR desde imagen").
 */
export const CodiQrCanvas = forwardRef<HTMLCanvasElement, { qrString: string }>(function CodiQrCanvas({ qrString }, ref) {
  return (
    <QRCodeCanvas
      ref={ref}
      value={qrString}
      size={1024}
      level={QR_LEVEL}
      marginSize={QR_MARGIN}
      fgColor={FG}
      bgColor={BG}
      aria-hidden
      style={{ display: 'none' }}
    />
  )
})
