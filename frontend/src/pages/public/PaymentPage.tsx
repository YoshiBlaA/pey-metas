// 05 · QR pendiente  /  06 · Pagado  /  07 · Expirado.
// Dos vistas para el estado pendiente según el dispositivo:
//  - ESCRITORIO: QR grande para escanearlo con el celular.
//  - MÓVIL: no puedes escanear tu propia pantalla → descargar/compartir el QR y leerlo
//    "desde imagen" en la app del banco, o mostrarlo para que otra persona lo escanee.
// En ambas: cuenta regresiva con expiresAt, polling cada 4 s y limpieza al desmontar.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { USE_MOCKS, publicApi, type ContributionStatus, type GoalPublicDetail } from '../../api'
import { useCountdown } from '../../hooks/useCountdown'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useIsDesktopWidth } from '../../hooks/useMediaQuery'
import { loadPayment, type StoredPayment } from '../../lib/paymentStorage'
import { canShareFile, downloadBlob, getQrPng, qrFileName } from '../../lib/qrFile'
import { formatCountdown, formatDateTime, formatMoney } from '../../lib/format'
import { AppBar } from '../../components/Layouts'
import { CodiQr, CodiQrCanvas, QR_LEVEL, QR_MARGIN } from '../../components/CodiQr'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { PaymentChip } from '../../components/PaymentChip'
import { Button, ButtonLink } from '../../components/Button'
import { ErrorAlert } from '../../components/ErrorAlert'
import { Spinner } from '../../components/Spinner'
import { BackIcon, CheckIcon, ClockIcon, DownloadIcon, InfoIcon, PhoneIcon, QrIcon, RefreshIcon, ShareIcon } from '../../components/Icons'

const POLL_MS = 4000
const QR_TTL_S = 1200 // vigencia configurada en el backend (20 min); solo para la barrita del contador

export function PaymentPage() {
  const { numRef = '' } = useParams()
  const location = useLocation()
  // Los datos del QR llegan por el state de la navegación; si se recargó, de sessionStorage.
  const [payment] = useState<StoredPayment | null>(() => (location.state as StoredPayment | null) ?? loadPayment(numRef))

  const [status, setStatus] = useState<ContributionStatus>(payment?.status ?? 'PENDING')
  const [expiresAt, setExpiresAt] = useState(payment?.expiresAt ?? null)
  const [goalId, setGoalId] = useState(payment?.goalId ?? null)
  const [amount, setAmount] = useState(payment?.amount ?? null)
  const [paidAt, setPaidAt] = useState<string | null>(null)
  const [goal, setGoal] = useState<GoalPublicDetail | null>(null)
  const [error, setError] = useState<unknown>(null)
  const inFlight = useRef(false) // evita lanzar una consulta si la anterior no ha terminado
  const isMobile = useIsMobile() // dispositivo (decide cómo se paga)
  const wide = useIsDesktopWidth() // ancho de pantalla (decide el layout)

  const secondsLeft = useCountdown(expiresAt)
  const timeIsUp = expiresAt !== null && secondsLeft === 0

  // Polling del estado mientras esté PENDING.
  useEffect(() => {
    if (status !== 'PENDING') return
    let alive = true
    const check = async () => {
      if (inFlight.current) return
      inFlight.current = true
      try {
        const res = await publicApi.getContribution(numRef)
        if (!alive) return
        setError(null)
        setStatus(res.status)
        setExpiresAt(res.expiresAt)
        setGoalId(res.goalId)
        setAmount(res.amount)
        setPaidAt(res.paidAt)
      } catch (e) {
        if (alive) setError(e)
      } finally {
        inFlight.current = false
      }
    }
    void check()
    const id = window.setInterval(check, POLL_MS)
    return () => {
      alive = false
      window.clearInterval(id) // ¡importante! si no, seguiría consultando al salir de la pantalla
    }
  }, [numRef, status])

  // Si se acabó el tiempo y el backend aún dice PENDING, hacemos una última consulta
  // y, si sigue igual, lo mostramos como expirado (el backend también lo reporta así).
  useEffect(() => {
    if (!timeIsUp || status !== 'PENDING') return
    let alive = true
    publicApi
      .getContribution(numRef)
      .then((r) => {
        if (!alive) return
        setPaidAt(r.paidAt)
        setStatus(r.status === 'PENDING' ? 'EXPIRED' : r.status)
      })
      .catch(() => alive && setStatus('EXPIRED'))
    return () => {
      alive = false
    }
  }, [timeIsUp, status, numRef])

  // Cargamos la meta (título) y la volvemos a pedir al pagarse para mostrar la barra actualizada.
  useEffect(() => {
    if (goalId === null) return
    let alive = true
    publicApi.getGoal(goalId, 1).then((g) => alive && setGoal(g)).catch(() => {})
    return () => {
      alive = false
    }
  }, [status === 'PAID', goalId])

  const goalTitle = goal?.title ?? payment?.goalTitle ?? ''
  const backTo = goalId !== null ? `/metas/${goalId}` : '/'
  const common = { numRef, amount, goalTitle }

  const prefill = payment ? { amount: payment.amount, displayName: payment.displayName, anonymous: payment.anonymous, message: payment.message } : undefined
  const retryTo = goalId !== null ? `/metas/${goalId}/aportar` : '/'

  let body: React.ReactNode
  if (status === 'PAID')
    body = wide
      ? <PaidDesktop {...common} goal={goal} payment={payment} paidAt={paidAt} backTo={backTo} />
      : <PaidView {...common} goal={goal} name={payment?.displayName} paidAt={paidAt} backTo={backTo} />
  else if (status === 'EXPIRED')
    body = wide
      ? <ExpiredDesktop {...common} payment={payment} retryTo={retryTo} prefill={prefill} backTo={backTo} />
      : <ExpiredView {...common} qrString={payment?.qrString} retryTo={retryTo} prefill={prefill} backTo={backTo} />
  else if (!payment)
    body = (
      <div className={wide ? 'mx-auto w-full max-w-[480px] pt-8' : 'ui-content mx-auto w-full max-w-[480px]'}>
        <div className="ui-card items-center text-center">
          <PaymentChip status="PENDING" />
          {amount !== null && <span className="t-h1">{formatMoney(amount)} MXN</span>}
          <p className="t-body">
            El QR no está guardado en este dispositivo (se abrió en otro navegador o pestaña). Si ya pagaste, aquí lo verás en unos segundos; si no, genera uno nuevo desde la meta.
          </p>
          <ButtonLink to={retryTo}>Generar otro QR</ButtonLink>
        </div>
      </div>
    )
  else if (isMobile)
    body = <PendingMobile {...common} payment={payment} secondsLeft={secondsLeft} error={error} />
  else body = <PendingDesktop {...common} payment={payment} secondsLeft={secondsLeft} error={error} backTo={backTo} />

  if (wide)
    return (
      <div className="flex flex-col gap-5 pt-6">
        {status !== 'PAID' && (
          <Link to={backTo} className="t-strong flex w-max items-center gap-1.5 text-brand-700 hover:underline">
            <BackIcon className="size-4" /> {goalTitle ? `Volver a “${goalTitle}”` : 'Volver a la meta'}
          </Link>
        )}
        {/* En pantalla ancha pero en un dispositivo táctil (tablet) usamos la vista móvil centrada. */}
        {status === 'PENDING' && payment && isMobile ? <div className="mx-auto w-full max-w-[480px]">{body}</div> : body}
      </div>
    )
  return (
    <>
      <AppBar title={status === 'PAID' ? 'Pago recibido' : 'Paga con CoDi'} backTo={backTo} />
      {body}
    </>
  )
}

// ---------------------------------------------------------------------------------------
// Piezas compartidas
// ---------------------------------------------------------------------------------------
interface CommonProps {
  numRef: string
  amount: number | null
  goalTitle: string
}
interface PendingProps extends CommonProps {
  payment: StoredPayment
  secondsLeft: number
  error: unknown
}

/** Encabezado de la tarjeta: chip + referencia, monto y meta. */
function PaymentHeader({ status, numRef, amount, goalTitle, muted = false }: CommonProps & { status: ContributionStatus; muted?: boolean }) {
  return (
    <>
      <div className="flex w-full items-center justify-between">
        <PaymentChip status={status} />
        <span className="t-cap !text-ink-400">Ref. {numRef}</span>
      </div>
      <div className="flex flex-col items-center">
        {amount !== null && <span className={`t-h1 tabular-nums ${muted ? 'text-ink-400' : ''}`}>{formatMoney(amount)} MXN</span>}
        {goalTitle && <span className={`t-body ${muted ? '!text-ink-400' : ''}`}>para “{goalTitle}”</span>}
      </div>
    </>
  )
}

/** Caja ámbar con la cuenta regresiva y una barrita de tiempo restante. */
function Countdown({ secondsLeft, large = false }: { secondsLeft: number; large?: boolean }) {
  const pct = Math.min(100, (secondsLeft / QR_TTL_S) * 100)
  return (
    <div className={`flex w-full flex-col bg-pending-bg ${large ? 'gap-2.5 rounded-[14px] px-[18px] py-4' : 'gap-2 rounded-xl px-3.5 py-3'}`} role="timer" aria-live="off">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-pending-text">
          <ClockIcon className="size-[18px]" />
          <span className="t-strong">El código expira en</span>
        </div>
        <span className={`${large ? 't-h1' : 't-h2'} tabular-nums text-pending-text`} aria-label={`${Math.floor(secondsLeft / 60)} minutos ${secondsLeft % 60} segundos`}>
          {formatCountdown(secondsLeft)}
        </span>
      </div>
      <div className="ui-bar !bg-[#FDE7B0]">
        <div className="!bg-pending" style={{ width: `${pct}%`, transition: 'width 1s linear' }} />
      </div>
    </div>
  )
}

function Waiting({ error, large = false }: { error: unknown; large?: boolean }) {
  return (
    <>
      <div className={`flex items-center gap-2 ${large ? '' : 'justify-center'}`} aria-live="polite">
        <span className="size-2 animate-pulse rounded-full bg-pending" aria-hidden />
        <span className={large ? 't-strong text-ink-700' : 't-cap'}>Esperando pago… revisamos automáticamente</span>
      </div>
      {error ? <ErrorAlert error={error} /> : null}
    </>
  )
}

/** Aviso en modo mocks: el QR tiene la forma de CoDi pero no es cobrable. */
function DemoNotice() {
  if (!USE_MOCKS) return null
  return (
    <div role="note" className="flex w-full gap-2 rounded-xl border border-pending/40 bg-pending-bg p-3 text-left text-pending-text">
      <InfoIcon className="mt-0.5 size-4 shrink-0" />
      <p className="t-cap !text-pending-text">
        <b>QR de demostración: no se puede pagar.</b> Para un QR real conecta el backend (VITE_USE_MOCKS=false) con una API key de Pey.
      </p>
    </div>
  )
}

function Steps({ steps, large = false }: { steps: React.ReactNode[]; large?: boolean }) {
  return (
    <ol className={`flex flex-col ${large ? 'gap-3' : 'gap-2.5'}`}>
      {steps.map((s, i) => (
        <li key={i} className={`flex items-start ${large ? 'gap-3' : 'gap-2.5'}`}>
          <span className="ui-num">{i + 1}</span>
          <span className="t-body" style={large ? { fontSize: 15 } : undefined}>{s}</span>
        </li>
      ))}
    </ol>
  )
}

/** Marco del Figma alrededor del QR (borde verde 2px, radio 20, fondo blanco). */
function QrFrame({ payment, size }: { payment: StoredPayment; size: number }) {
  return (
    <div className="rounded-[20px] border-2 border-brand-600 bg-white p-2.5">
      <CodiQr qrString={payment.qrString} qrImage={payment.qrImage} size={size} />
    </div>
  )
}

/** Descargar / compartir el PNG del QR. Prioriza el PNG de Pey (qrImage) si viene. */
function useQrFile(payment: StoredPayment) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [shareable, setShareable] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    // Probamos si el navegador permite compartir archivos (Android/iOS sí; escritorio casi nunca).
    let alive = true
    getQrPng(payment.qrImage, canvasRef.current)
      .then((b) => alive && setShareable(canShareFile(new File([b], qrFileName(payment.numRef), { type: 'image/png' }))))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [payment])

  const download = async () => {
    try {
      downloadBlob(await getQrPng(payment.qrImage, canvasRef.current), qrFileName(payment.numRef))
      setMsg('QR descargado. Búscalo en tu galería o en Descargas.')
    } catch {
      setMsg('No pudimos descargar el QR. Usa “Mostrar QR” y toma una captura de pantalla.')
    }
  }
  const share = async () => {
    try {
      const blob = await getQrPng(payment.qrImage, canvasRef.current)
      await navigator.share({
        files: [new File([blob], qrFileName(payment.numRef), { type: 'image/png' })],
        title: 'QR de CoDi',
        text: `QR de CoDi por ${formatMoney(payment.amount)} MXN`,
      })
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setMsg('No se pudo compartir el QR.')
    }
  }
  // Canvas oculto de alta resolución (solo si no hay PNG de Pey).
  const canvas = payment.qrImage ? null : <CodiQrCanvas ref={canvasRef} qrString={payment.qrString} />
  return { download, share, shareable, msg, canvas }
}

// ---------------------------------------------------------------------------------------
// Vistas
// ---------------------------------------------------------------------------------------

/** ESCRITORIO (Figma 05): tarjeta de 960px, QR de 300px a la izquierda e instrucciones a la derecha. */
function PendingDesktop({ payment, secondsLeft, error, backTo, ...common }: PendingProps & { backTo: string }) {
  const { download, msg, canvas } = useQrFile(payment)
  return (
    <div className="ui-card mx-auto w-full max-w-[960px] !flex-row !gap-0" style={{ padding: '36px 40px' }}>
      {canvas}
      <div className="flex w-[380px] shrink-0 flex-col items-center gap-[18px] border-r border-line pr-10">
        <PaymentHeader status="PENDING" {...common} />
        <div className="rounded-[24px] border-2 border-brand-600 bg-white p-2">
          {/* 280px de QR + margen blanco de 4 módulos = el cuadro de 300px del diseño */}
          <CodiQr qrString={payment.qrString} qrImage={payment.qrImage} size={280} />
        </div>
        <button onClick={() => void download()} className="t-strong flex items-center gap-1.5 text-brand-700 hover:underline">
          <DownloadIcon className="size-4" /> Descargar QR
        </button>
        {msg && <p className="t-cap text-center" role="status">{msg}</p>}
      </div>
      <div className="flex flex-1 flex-col gap-4 pl-10">
        <h1 className="t-h1">Paga con CoDi</h1>
        <Countdown secondsLeft={secondsLeft} large />
        <Waiting error={error} large />
        <div className="h-px bg-line" />
        <h2 className="t-h3">Cómo pagar</h2>
        <Steps
          large
          steps={[
            'Abre la app de tu banco en tu celular.',
            <>Elige <b>“CoDi”</b> › <b>Escanear QR</b> y apunta a esta pantalla.</>,
            'Confirma el pago. Aquí lo veremos al instante.',
          ]}
        />
        <DemoNotice />
        <Link to={backTo} className="ui-btn ghost !h-11 !w-max !justify-start !px-0">Cancelar y volver a la meta</Link>
      </div>
    </div>
  )
}

/** MÓVIL: pagar desde el mismo celular (descargar/compartir) o mostrar el QR a otra persona. */
function PendingMobile({ payment, secondsLeft, error, ...common }: PendingProps) {
  const { download, share, shareable, msg, canvas } = useQrFile(payment)
  const [showQr, setShowQr] = useState(false)
  return (
    <div className="ui-content">
      {canvas}
      <div className="ui-card items-center text-center" style={{ gap: 14 }}>
        <PaymentHeader status="PENDING" {...common} />
        {showQr ? (
          <>
            <QrFrame payment={payment} size={280} />
            <p className="t-cap">Muéstrale este código a quien va a pagar para que lo escanee con CoDi.</p>
          </>
        ) : (
          <div className="flex w-full items-center gap-3 rounded-xl bg-brand-50 p-3 text-left">
            <span className="ui-tile size-10 bg-brand-100 text-brand-700"><PhoneIcon /></span>
            <p className="t-cap !text-brand-700">
              Estás en tu celular: guarda el QR y ábrelo desde la app de tu banco con <b>“Leer QR desde imagen”</b>.
            </p>
          </div>
        )}
        <Countdown secondsLeft={secondsLeft} />
        <Waiting error={error} />
      </div>

      <div className="flex flex-col gap-2.5">
        <Button onClick={() => void download()}>
          <DownloadIcon /> Descargar QR
        </Button>
        {shareable && (
          <Button variant="secondary" onClick={() => void share()}>
            <ShareIcon /> Compartir QR
          </Button>
        )}
        <Button variant="ghost" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
          <QrIcon /> {showQr ? 'Ocultar QR' : 'Mostrar QR'}
        </Button>
        {msg && <p className="t-cap text-center" role="status">{msg}</p>}
      </div>

      <Steps
        steps={[
          <>Toca <b>Descargar QR</b>{shareable ? ' (o Compartir › Guardar imagen)' : ''}.</>,
          <>Abre la app de tu banco › <b>CoDi</b> › <b>Leer QR desde imagen</b> (o el ícono de galería al escanear).</>,
          'Elige la imagen y confirma el pago. Aquí lo veremos al instante.',
        ]}
      />
      <DemoNotice />
    </div>
  )
}

/** 06 · Pagado: gracias + progreso actualizado de la meta. */
function PaidView({ numRef, amount, goalTitle, goal, name, paidAt, backTo }: CommonProps & { goal: GoalPublicDetail | null; name?: string | null; paidAt: string | null; backTo: string }) {
  const first = name?.trim().split(/\s+/)[0]
  return (
    <div className="mx-auto w-full max-w-[480px] pb-28">
      <div className="ui-content">
        <div className="flex flex-col items-center gap-3 pt-3 text-center" aria-live="polite">
          <span className="ui-tile size-[104px] !rounded-full bg-brand-100">
            <span className="ui-tile size-[72px] !rounded-full bg-brand-600 text-white">
              <CheckIcon className="size-9" />
            </span>
          </span>
          <PaymentChip status="PAID" />
          <h2 className="t-h1">{first ? `¡Gracias, ${first}!` : '¡Gracias por tu aportación!'}</h2>
          {amount !== null && (
            <p className="t-bodyL">
              Recibimos tu aportación de {formatMoney(amount)} MXN{goalTitle ? <> para “{goalTitle}”</> : null}.
            </p>
          )}
        </div>

        <div className="ui-card">
          {goal ? (
            <>
              <div className="flex items-center justify-between">
                <span className="t-strong text-ink-700">Progreso actualizado</span>
                {amount !== null && <span className="t-strong text-brand-700">+{formatMoney(amount)}</span>}
              </div>
              <div className="flex flex-col">
                <Money amount={goal.raisedAmount} className="t-xl" />
                <span className="t-body">recaudados de <Money amount={goal.targetAmount} /> MXN</span>
              </div>
              <ProgressBar value={goal.percentage} size="lg" achieved={goal.status === 'CLOSED'} />
              <div className="flex items-center justify-between">
                <span className="t-strong text-brand-700">{goal.percentage}% completado</span>
                <span className="t-body">{goal.paidContributionsCount} aportaciones</span>
              </div>
            </>
          ) : (
            <Spinner label="Actualizando la meta…" />
          )}
        </div>

        <div className="ui-card ui-card-flat" style={{ gap: 10 }}>
          <div className="flex items-center justify-between">
            <span className="t-body">Referencia</span>
            <span className="t-strong">{numRef}</span>
          </div>
          {paidAt && (
            <div className="flex items-center justify-between">
              <span className="t-body">Fecha</span>
              <span className="t-strong">{formatDateTime(paidAt)}</span>
            </div>
          )}
        </div>
      </div>
      <div className="ui-bottombar">
        <div className="mx-auto w-full max-w-[440px]">
          <ButtonLink to={backTo}>Volver a la meta</ButtonLink>
        </div>
      </div>
    </div>
  )
}

/** 07 · Expirado: QR atenuado + botón para generar otro. */
function ExpiredView({ numRef, amount, goalTitle, qrString, retryTo, prefill, backTo }: CommonProps & { qrString?: string; retryTo: string; prefill?: object; backTo: string }) {
  return (
    <div className="mx-auto w-full max-w-[480px] pb-40">
      <div className="ui-content">
        <div className="ui-card items-center text-center" style={{ gap: 14 }} aria-live="polite">
          <PaymentHeader status="EXPIRED" numRef={numRef} amount={amount} goalTitle={goalTitle} muted />
          <ExpiredQr qrString={qrString} size={236} />
          <p className="t-body">Pasaron los 20 minutos y el código ya no es válido. No se hizo ningún cargo a tu cuenta.</p>
        </div>
      </div>
      <div className="ui-bottombar" style={{ gap: 6 }}>
        <div className="mx-auto flex w-full max-w-[440px] flex-col gap-1.5">
          <ButtonLink to={retryTo} state={prefill}>
            <RefreshIcon /> Generar otro QR
          </ButtonLink>
          <Link to={backTo} className="ui-btn ghost">Volver a la meta</Link>
        </div>
      </div>
    </div>
  )
}

/** QR atenuado con el aviso "Código expirado" (no se puede escanear: es solo visual). */
function ExpiredQr({ qrString, size }: { qrString?: string; size: number }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden rounded-[20px] border-2 border-line bg-closed" style={{ width: size, height: size, borderRadius: size > 260 ? 24 : 20 }}>
      {qrString && (
        <div className="opacity-35" aria-hidden>
          <QRCodeSVG value={qrString} size={size - 36} level={QR_LEVEL} marginSize={QR_MARGIN} fgColor="#8A97A5" bgColor="transparent" />
        </div>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span className={`ui-tile !rounded-full bg-expired-bg text-expired ${size > 260 ? 'size-16' : 'size-14'}`}>
          <ClockIcon className="size-7" />
        </span>
        <span className="t-h3 text-expired">Código expirado</span>
        <span className="t-strong text-ink-400">00:00</span>
      </div>
    </div>
  )
}

/** 06 · Pagado (escritorio). */
function PaidDesktop({ numRef, amount, goalTitle, goal, payment, paidAt, backTo }: CommonProps & { goal: GoalPublicDetail | null; payment: StoredPayment | null; paidAt: string | null; backTo: string }) {
  const name = payment?.displayName
  const first = name?.trim().split(/\s+/)[0]
  const share = () => {
    const url = window.location.origin + backTo
    if (typeof navigator.share === 'function') void navigator.share({ title: goalTitle, url }).catch(() => {})
    else void navigator.clipboard?.writeText(url)
  }
  return (
    <div className="flex flex-col items-center gap-6 pt-4">
      <div className="flex w-full max-w-[640px] flex-col items-center gap-3 text-center" aria-live="polite">
        <span className="ui-tile size-28 !rounded-full bg-brand-100">
          <span className="ui-tile size-[78px] !rounded-full bg-brand-600 text-white"><CheckIcon className="size-10" /></span>
        </span>
        <PaymentChip status="PAID" />
        <h1 className="text-[40px] font-extrabold leading-[48px]">{first ? `¡Gracias, ${first}!` : '¡Gracias por tu aportación!'}</h1>
        {amount !== null && (
          <p className="t-bodyL">Recibimos tu aportación de {formatMoney(amount)} MXN{goalTitle ? <> para “{goalTitle}”</> : null}.</p>
        )}
      </div>
      <div className="flex w-full max-w-[880px] items-stretch gap-6">
        <div className="ui-card flex-1" style={{ padding: 24, gap: 14 }}>
          {goal ? (
            <>
              <div className="flex items-center justify-between">
                <span className="t-strong text-ink-700">Progreso actualizado</span>
                {amount !== null && <span className="t-strong text-brand-700">+{formatMoney(amount)}</span>}
              </div>
              <div className="flex flex-col">
                <Money amount={goal.raisedAmount} className="t-xl" />
                <span className="t-body">recaudados de <Money amount={goal.targetAmount} /> MXN</span>
              </div>
              <ProgressBar value={goal.percentage} size="lg" achieved={goal.status === 'CLOSED'} />
              <div className="flex items-center justify-between">
                <span className="t-strong text-brand-700">{goal.percentage}% completado</span>
                <span className="t-body">{goal.paidContributionsCount} aportaciones</span>
              </div>
            </>
          ) : (
            <Spinner label="Actualizando la meta…" />
          )}
        </div>
        <div className="ui-card ui-card-flat w-[320px] justify-center" style={{ padding: 24, gap: 14 }}>
          <Detail label="Referencia" value={numRef} />
          {paidAt && <Detail label="Fecha" value={formatDateTime(paidAt)} />}
          <Detail label="Método" value="CoDi vía Pey" />
          <Detail label="Mostrar como" value={payment?.anonymous ? 'Anónimo' : name || '—'} />
        </div>
      </div>
      <div className="flex justify-center gap-3">
        <ButtonLink to={backTo} className="!w-[260px]">Volver a la meta</ButtonLink>
        <Button variant="secondary" className="!w-[260px]" onClick={share}><ShareIcon className="size-[18px]" /> Compartir meta</Button>
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="t-body">{label}</span>
      <span className="t-strong truncate text-right">{value}</span>
    </div>
  )
}

/** 07 · Expirado (escritorio): QR atenuado + resumen de lo que se conserva al generar otro. */
function ExpiredDesktop({ numRef, amount, goalTitle, payment, retryTo, prefill, backTo }: CommonProps & { payment: StoredPayment | null; retryTo: string; prefill?: object; backTo: string }) {
  return (
    <div className="ui-card mx-auto w-full max-w-[960px] !flex-row !gap-0" style={{ padding: '36px 40px' }} aria-live="polite">
      <div className="flex w-[380px] shrink-0 flex-col items-center gap-[18px] border-r border-line pr-10">
        <PaymentHeader status="EXPIRED" numRef={numRef} amount={amount} goalTitle={goalTitle} muted />
        <ExpiredQr qrString={payment?.qrString} size={300} />
      </div>
      <div className="flex flex-1 flex-col gap-4 pl-10">
        <h1 className="t-h1">Paga con CoDi</h1>
        <div className="flex items-start gap-2.5 rounded-[14px] bg-expired-bg px-[18px] py-4">
          <ClockIcon className="mt-0.5 size-[18px] shrink-0 text-expired" />
          <div className="flex flex-col gap-0.5">
            <span className="t-strong text-expired">El código ya no es válido</span>
            <span className="t-body">Pasaron los 20 minutos y el código ya no es válido. No se hizo ningún cargo a tu cuenta.</span>
          </div>
        </div>
        {payment && (
          <>
            <p className="t-body">Puedes generar un QR nuevo por el mismo monto. Tu nombre y mensaje se conservan.</p>
            <div className="ui-card ui-card-flat" style={{ gap: 10, padding: '14px 16px' }}>
              <Detail label="Monto" value={`${formatMoney(payment.amount)} MXN`} />
              <Detail label="Nombre" value={payment.anonymous ? 'Anónimo' : payment.displayName || '—'} />
              {payment.message && <Detail label="Mensaje" value={payment.message} />}
            </div>
          </>
        )}
        <ButtonLink to={retryTo} state={prefill}><RefreshIcon /> Generar otro QR</ButtonLink>
        <Link to={backTo} className="ui-btn ghost !h-11">Volver a la meta</Link>
      </div>
    </div>
  )
}
