// 04 · Aportar: montos sugeridos, monto propio, nombre/apodo, mensaje y opción anónima.
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, publicApi } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { TopBar } from '../../components/Layouts'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { TextArea, TextField } from '../../components/Field'
import { Button, ButtonLink } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { formatMoney } from '../../lib/format'
import { LIMITS, isEmpty, parseAmount, validateContribution, type ContributionForm } from '../../lib/validation'
import { savePayment } from '../../lib/paymentStorage'

export function ContributePage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { data: goal, error: loadError, loading } = useAsync(() => publicApi.getGoal(id, 1), [id])

  const [form, setForm] = useState<ContributionForm>({ amountText: '', displayName: '', anonymous: false, message: '' })
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
      savePayment(res)
      navigate(`/pago/${res.numRef}`, { state: res })
    } catch (e) {
      // Errores por campo del backend (400/422) se pintan junto a cada input.
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors)
      setSubmitError(e)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <Spinner />
  if (loadError || !goal) return <ErrorAlert error={loadError ?? 'Meta no encontrada'} />

  if (goal.status === 'CLOSED')
    return (
      <>
        <TopBar title="Aportar" backTo={`/metas/${id}`} />
        <p className="rounded-2xl bg-achieved-50 p-5 font-semibold text-achieved">Esta meta ya se logró y no recibe más aportaciones. ¡Gracias!</p>
        <ButtonLink to="/" variant="secondary" className="mt-4">Ver otras metas</ButtonLink>
      </>
    )

  const selected = parseAmount(form.amountText)

  return (
    <>
      <TopBar title="Aportar" backTo={`/metas/${id}`} />

      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="font-semibold">{goal.title}</p>
        <p className="mt-0.5 text-sm text-ink-700">
          <Money amount={goal.raisedAmount} /> de <Money amount={goal.targetAmount} />
        </p>
        <div className="mt-2"><ProgressBar value={goal.percentage} /></div>
      </div>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        <fieldset>
          <legend className="text-sm font-medium text-ink-700">¿Cuánto quieres aportar?</legend>
          {goal.presetAmounts.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {goal.presetAmounts.map((p) => {
                const active = selected === p
                return (
                  <button
                    type="button"
                    key={p}
                    aria-pressed={active}
                    onClick={() => set('amountText', String(p))}
                    className={`rounded-xl border px-3 py-3 font-semibold tabular-nums transition ${
                      active ? 'border-brand-600 bg-brand-100 text-brand-700' : 'border-line bg-card hover:bg-brand-50'
                    }`}
                  >
                    {formatMoney(p)}
                  </button>
                )
              })}
            </div>
          )}
        </fieldset>

        <TextField
          label="Otro monto (MXN)"
          inputMode="decimal"
          placeholder="$0.00"
          value={form.amountText}
          onChange={(e) => set('amountText', e.target.value)}
          error={errors.amount}
        />

        <TextField
          label="Tu nombre o apodo"
          placeholder="Ej. Mariana L."
          value={form.displayName}
          maxLength={LIMITS.displayName}
          onChange={(e) => set('displayName', e.target.value)}
          error={errors.displayName}
          hint={form.anonymous ? 'Se mostrará como “Anónimo”.' : undefined}
          autoComplete="nickname"
        />

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-card p-3.5">
          <input
            type="checkbox"
            className="size-5 accent-brand-600"
            checked={form.anonymous}
            onChange={(e) => set('anonymous', e.target.checked)}
          />
          <span>
            <span className="block font-medium">Aportar de forma anónima</span>
            <span className="block text-sm text-ink-700">Tu nombre no aparecerá en la lista pública.</span>
          </span>
        </label>

        <TextArea
          label="Mensaje (opcional)"
          placeholder="Escribe unas palabras de ánimo"
          value={form.message}
          maxLength={LIMITS.message}
          onChange={(e) => set('message', e.target.value)}
          error={errors.message}
        />

        <ErrorAlert error={submitError} />

        <Button type="submit" size="lg" loading={sending}>
          {selected && selected > 0 ? `Generar QR por ${formatMoney(selected)}` : 'Generar QR de pago'}
        </Button>
        <p className="text-center text-xs text-ink-400">Pagarás con CoDi desde la app de tu banco. El QR vence en 20 minutos.</p>
      </form>
    </>
  )
}
