// 04 · Aportar: montos sugeridos, monto propio, nombre/apodo, mensaje y opción anónima.
// Móvil: formulario con barra inferior fija. Escritorio: formulario de 640px + resumen de 400px.
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ApiError, publicApi, type GoalPublicDetail } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { useIsDesktopWidth } from '../../hooks/useMediaQuery'
import { AppBar } from '../../components/Layouts'
import { GoalIcon } from '../../components/GoalCard'
import { StatusBadge } from '../../components/StatusBadge'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { TextArea, TextField } from '../../components/Field'
import { Button, ButtonLink } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { HeartIcon, UsersIcon } from '../../components/Icons'
import { formatMoney } from '../../lib/format'
import { LIMITS, isEmpty, parseAmount, validateContribution, type ContributionForm } from '../../lib/validation'
import { savePayment } from '../../lib/paymentStorage'

/** Datos para precargar el formulario (desde "Generar otro QR" o un monto sugerido del detalle). */
export interface ContributePrefill {
  amount?: number
  displayName?: string | null
  anonymous?: boolean
  message?: string | null
}

export function ContributePage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const prefill = (useLocation().state as ContributePrefill | null) ?? {}
  const desktop = useIsDesktopWidth()
  const { data: goal, error: loadError, loading } = useAsync(() => publicApi.getGoal(id, 1), [id])

  const [form, setForm] = useState<ContributionForm>({
    amountText: prefill.amount ? String(prefill.amount) : '',
    displayName: prefill.displayName ?? '',
    anonymous: prefill.anonymous ?? false,
    message: prefill.message ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [sending, setSending] = useState(false)

  // Actualiza un campo del formulario y borra su error.
  const set = <K extends keyof ContributionForm>(k: K, v: ContributionForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k === 'amountText' ? 'amount' : k]: undefined }))
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setSubmitError(null)
    const v = validateContribution(form)
    setErrors(v)
    if (!isEmpty(v)) return

    setSending(true)
    try {
      const res = await publicApi.createContribution(id, {
        amount: parseAmount(form.amountText)!,
        displayName: form.anonymous ? (form.displayName.trim() || null) : form.displayName.trim(),
        anonymous: form.anonymous,
        message: form.message.trim() || null,
      })
      // Guardamos también nombre, mensaje y título: los usan "¡Gracias!" y "Generar otro QR".
      const stored = {
        ...res,
        displayName: form.anonymous ? null : form.displayName.trim(),
        anonymous: form.anonymous,
        message: form.message.trim() || null,
        goalTitle: goal?.title,
      }
      savePayment(stored)
      navigate(`/pago/${res.numRef}`, { state: stored })
    } catch (e) {
      // Errores por campo del backend (400/422) se pintan junto a cada input.
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors)
      setSubmitError(e)
    } finally {
      setSending(false)
    }
  }

  const bar = !desktop ? <AppBar title="Aportar" backTo={`/metas/${id}`} /> : null
  if (loading) return <>{bar}<Spinner /></>
  if (loadError || !goal) return <>{bar}<div className={desktop ? 'pt-8' : 'ui-content'}><ErrorAlert error={loadError ?? 'Meta no encontrada'} /></div></>

  if (goal.status === 'CLOSED')
    return (
      <>
        {bar}
        <div className={desktop ? 'mx-auto flex w-full max-w-[640px] flex-col gap-4 pt-8' : 'ui-content'}>
          <p className="t-strong rounded-2xl bg-achieved-50 p-5 text-achieved">Esta meta ya se logró y no recibe más aportaciones. ¡Gracias!</p>
          <ButtonLink to="/" variant="secondary">Ver otras metas</ButtonLink>
        </div>
      </>
    )

  const selected = parseAmount(form.amountText)
  const isPreset = selected !== null && goal.presetAmounts.includes(selected)
  // Montos sugeridos sin decimales cuando son enteros ("$200"), como en el Figma.
  const short = (n: number) => (Number.isInteger(n) ? `$${n.toLocaleString('es-MX')}` : formatMoney(n))
  const total = selected && selected > 0 ? `${formatMoney(selected)} MXN` : '—'

  // Campos compartidos por ambas vistas.
  const amounts = goal.presetAmounts.length > 0 && (
    <fieldset>
      <legend className="t-h3 mb-2.5">Elige un monto</legend>
      <div className="ui-amounts">
        {goal.presetAmounts.map((p) => (
          <button type="button" key={p} aria-pressed={selected === p && isPreset} onClick={() => set('amountText', String(p))} className="ui-amt tabular-nums">
            {short(p)}
          </button>
        ))}
      </div>
    </fieldset>
  )
  const amountField = (
    <TextField
      label={goal.presetAmounts.length ? 'O escribe otro monto (MXN)' : 'Monto (MXN)'}
      inputMode="decimal"
      placeholder="0.00"
      prefix="$"
      value={isPreset ? '' : form.amountText}
      onChange={(e) => set('amountText', e.target.value)}
      error={errors.amount}
    />
  )
  const nameField = (
    <TextField
      label="Nombre o apodo"
      placeholder="Ej. Mariana L."
      value={form.displayName}
      maxLength={LIMITS.displayName}
      showCount={false}
      onChange={(e) => set('displayName', e.target.value)}
      error={errors.displayName}
      autoComplete="nickname"
      disabled={form.anonymous}
    />
  )
  const messageField = (
    <TextArea
      label="Mensaje (opcional)"
      placeholder="Escribe unas palabras de ánimo"
      value={form.message}
      maxLength={LIMITS.message}
      showCount={false}
      onChange={(e) => set('message', e.target.value)}
      error={errors.message}
      className={desktop ? '!h-[84px]' : ''}
    />
  )
  const anonymousField = (
    <label className="flex cursor-pointer flex-col gap-1">
      <span className="flex items-center gap-2.5">
        <input type="checkbox" className="ui-check" checked={form.anonymous} onChange={(e) => set('anonymous', e.target.checked)} />
        <span className="t-body !text-ink-900">Aportar como anónimo</span>
      </span>
      <span className="t-cap pl-8 !text-ink-400">Tu nombre no aparecerá en la lista de aportaciones.</span>
    </label>
  )

  if (desktop)
    return (
      <div className="flex flex-col gap-5 pt-6">
        <nav className="t-crumb" aria-label="Ruta">
          <Link to="/" className="hover:text-ink-700">Metas</Link><span className="mx-1.5">/</span>
          <Link to={`/metas/${id}`} className="hover:text-ink-700">{goal.title}</Link><span className="mx-1.5">/</span>
          <span>Aportar</span>
        </nav>
        <div className="flex items-start justify-center gap-8">
          <form onSubmit={onSubmit} noValidate className="ui-card w-[640px] min-w-0" style={{ padding: '28px 32px', gap: 18 }}>
            <div className="flex flex-col gap-1">
              <h1 className="t-h1">Aportar</h1>
              <p className="t-body">Elige un monto y genera tu QR de CoDi. Lo pagas desde la app de tu banco.</p>
            </div>
            {amounts}
            <div className="flex items-start gap-4">{amountField}{nameField}</div>
            {messageField}
            {anonymousField}
            <ErrorAlert error={submitError} />
            <div className="h-px bg-line" />
            <div className="flex items-center gap-5">
              <div className="flex w-[200px] shrink-0 flex-col">
                <span className="t-body">Total a aportar</span>
                <span className="t-h2 tabular-nums">{total}</span>
              </div>
              <Button type="submit" loading={sending}>Generar QR de CoDi</Button>
            </div>
          </form>
          <Summary goal={goal} />
        </div>
      </div>
    )

  return (
    <form onSubmit={onSubmit} noValidate className="pb-40">
      {bar}
      <div className="ui-content" style={{ gap: 15 }}>
        <div className="ui-card" style={{ padding: '14px 16px' }}>
          <div className="flex items-center gap-3">
            <GoalIcon achieved={false} size={40} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="t-strong truncate">{goal.title}</span>
              <span className="t-cap">
                <Money amount={goal.raisedAmount} /> de <Money amount={goal.targetAmount} /> MXN · {goal.percentage}%
              </span>
            </div>
          </div>
          <ProgressBar value={goal.percentage} />
        </div>
        {amounts}
        {amountField}
        {nameField}
        {messageField}
        {anonymousField}
        <ErrorAlert error={submitError} />
      </div>

      <div className="ui-bottombar">
        <div className="mx-auto flex w-full max-w-[440px] flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="t-body">Total a aportar</span>
            <span className="t-strong">{total}</span>
          </div>
          <Button type="submit" loading={sending}>Generar QR de CoDi</Button>
        </div>
      </div>
    </form>
  )
}

/** Resumen de la meta a la derecha (escritorio). */
function Summary({ goal }: { goal: GoalPublicDetail }) {
  const remaining = Math.max(0, goal.targetAmount - goal.raisedAmount)
  return (
    <aside className="ui-card w-[400px] shrink-0" style={{ padding: 24, gap: 16 }}>
      <div className="flex h-[110px] flex-col justify-between rounded-[20px] p-4" style={{ background: 'linear-gradient(120deg,#0E9F6E 0%,#3CC48E 70%,#6FD9AC 100%)' }}>
        <span className="w-max rounded-full bg-white/85"><StatusBadge status={goal.status} /></span>
        <span className="ui-tile size-11 bg-white text-brand-600"><HeartIcon /></span>
      </div>
      <h2 className="t-h2">{goal.title}</h2>
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <Money amount={goal.raisedAmount} className="t-h2" />
          <span className="t-cap">de <Money amount={goal.targetAmount} /> MXN</span>
        </div>
        <span className="t-h3 text-brand-700">{goal.percentage}%</span>
      </div>
      <ProgressBar value={goal.percentage} />
      <span className="t-cap flex items-center gap-1.5">
        <UsersIcon className="size-4 text-ink-400" /> {goal.paidContributionsCount} aportaciones · faltan {formatMoney(remaining)}
      </span>
    </aside>
  )
}
