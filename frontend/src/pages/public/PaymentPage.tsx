// 05 · QR pendiente  /  06 · Pagado  /  07 · Expirado.
// Cuenta regresiva con expiresAt, polling cada 4 s y limpieza de intervalos al desmontar.
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { publicApi, type ContributionCreatedResponse, type ContributionStatus, type GoalPublicDetail } from '../../api'
import { useCountdown } from '../../hooks/useCountdown'
import { loadPayment } from '../../lib/paymentStorage'
import { formatCountdown } from '../../lib/format'
import { TopBar } from '../../components/Layouts'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { PaymentChip } from '../../components/PaymentChip'
import { ButtonLink } from '../../components/Button'
import { ErrorAlert } from '../../components/ErrorAlert'
import { Spinner } from '../../components/Spinner'
import { CheckIcon, ClockIcon } from '../../components/Icons'

const POLL_MS = 4000

export function PaymentPage() {
  const { numRef = '' } = useParams()
  const location = useLocation()
  // Los datos del QR llegan por el state de la navegación; si se recargó, de sessionStorage.
  const payment = (location.state as ContributionCreatedResponse | null) ?? loadPayment(numRef)

  const [status, setStatus] = useState<ContributionStatus>(payment?.status ?? 'PENDING')
  const [expiresAt, setExpiresAt] = useState(payment?.expiresAt ?? null)
  const [goalId, setGoalId] = useState(payment?.goalId ?? null)
  const [amount, setAmount] = useState(payment?.amount ?? null)
  const [goal, setGoal] = useState<GoalPublicDetail | null>(null)
  const [error, setError] = useState<unknown>(null)
  const inFlight = useRef(false) // evita lanzar una consulta si la anterior no ha terminado

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
  // y, si sigue igual, lo mostramos como expirado (el backend lo marcará también).
  useEffect(() => {
    if (!timeIsUp || status !== 'PENDING') return
    let alive = true
    publicApi
      .getContribution(numRef)
      .then((r) => alive && setStatus(r.status === 'PENDING' ? 'EXPIRED' : r.status))
      .catch(() => alive && setStatus('EXPIRED'))
    return () => {
      alive = false
    }
  }, [timeIsUp, status, numRef])

  // Al pagarse, volvemos a pedir la meta para mostrar la barra actualizada.
  useEffect(() => {
    if (status !== 'PAID' || goalId === null) return
    let alive = true
    publicApi.getGoal(goalId, 1).then((g) => alive && setGoal(g)).catch(() => {})
    return () => {
      alive = false
    }
  }, [status, goalId])

  const backTo = goalId !== null ? `/metas/${goalId}` : '/'

  return (
    <>
      <TopBar title="Pagar con CoDi" backTo={backTo} />
      <div className="flex flex-col items-center text-center">
        <PaymentChip status={status} />
        {amount !== null && <Money amount={amount} className="mt-3 text-4xl font-extrabold tracking-tight" />}
        <p className="mt-1 text-sm text-ink-400">Referencia {numRef}</p>
      </div>

      {status === 'PENDING' && (
        <section className="mt-6 rounded-2xl border border-line bg-card p-6 text-center shadow-sm" aria-live="polite">
          {payment ? (
            <div className="mx-auto w-fit rounded-xl border border-line bg-white p-3">
              {payment.qrImage ? (
                <img src={`data:image/png;base64,${payment.qrImage}`} alt="Código QR de CoDi para pagar" className="size-60" />
              ) : (
                <QRCodeSVG value={payment.qrString} size={240} level="M" marginSize={0} title="Código QR de CoDi para pagar" />
              )}
            </div>
          ) : (
            <p className="text-ink-700">No tenemos el QR en este dispositivo. Puedes generar uno nuevo desde la meta.</p>
          )}
          <p className="mt-4 flex items-center justify-center gap-2 font-semibold text-pending-text">
            <ClockIcon />
            <span>
              Vence en <span className="tabular-nums">{formatCountdown(secondsLeft)}</span>
            </span>
          </p>
          <ol className="mt-4 space-y-1 text-left text-sm text-ink-700">
            <li>1. Abre la app de tu banco y entra a CoDi.</li>
            <li>2. Escanea este código y confirma el pago.</li>
            <li>3. Esta pantalla se actualizará sola al recibirlo.</li>
          </ol>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-400">
            <span className="size-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" aria-hidden />
            Esperando confirmación…
          </div>
          {error ? <div className="mt-4"><ErrorAlert error={error} /></div> : null}
        </section>
      )}

      {status === 'PAID' && (
        <section className="mt-6 rounded-2xl border border-line bg-card p-6 text-center shadow-sm" aria-live="polite">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-100 text-brand-600">
            <CheckIcon className="size-8" />
          </span>
          <h2 className="mt-4 text-2xl font-bold">¡Gracias por tu aportación!</h2>
          <p className="mt-1 text-ink-700">Tu pago se recibió correctamente.</p>
          {goal ? (
            <div className="mt-5 text-left">
              <p className="font-semibold">{goal.title}</p>
              <p className="text-sm text-ink-700">
                <Money amount={goal.raisedAmount} /> de <Money amount={goal.targetAmount} /> · {goal.percentage}%
              </p>
              <div className="mt-2"><ProgressBar value={goal.percentage} size="lg" achieved={goal.status === 'CLOSED'} /></div>
            </div>
          ) : (
            <Spinner label="Actualizando la meta…" />
          )}
          <ButtonLink to={backTo} size="lg" className="mt-6">Ver la meta</ButtonLink>
        </section>
      )}

      {status === 'EXPIRED' && (
        <section className="mt-6 rounded-2xl border border-line bg-card p-6 text-center shadow-sm" aria-live="polite">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-expired-bg text-expired">
            <ClockIcon className="size-8" />
          </span>
          <h2 className="mt-4 text-2xl font-bold">El código expiró</h2>
          <p className="mt-1 text-ink-700">No se realizó ningún cargo. Puedes generar un código nuevo.</p>
          {goalId !== null && (
            <ButtonLink to={`/metas/${goalId}/aportar`} size="lg" className="mt-6">Generar otro QR</ButtonLink>
          )}
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-brand-700">Ver otras metas</Link>
        </section>
      )}
    </>
  )
}
