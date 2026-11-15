// 10 · Crear / editar meta. La misma pantalla sirve para ambas cosas según haya :id.
// Escritorio: formulario + vista previa en móvil. Móvil: Cancelar/Guardar fijos abajo.
import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, adminApi, type GoalStatus } from '../../api'
import { useIsAdminDesktop } from '../../hooks/useMediaQuery'
import { AppBar } from '../../components/Layouts'
import { TextArea, TextField } from '../../components/Field'
import { Button, ButtonLink } from '../../components/Button'
import { GoalCard } from '../../components/GoalCard'
import { StatusBadge } from '../../components/StatusBadge'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { PlusIcon, ShieldIcon, XIcon } from '../../components/Icons'
import { formatAmountInput, formatMoney } from '../../lib/format'
import { LIMITS, hasMax2Decimals, isEmpty, parseAmount, validateGoal, type GoalForm } from '../../lib/validation'

const EMPTY: GoalForm = { title: '', description: '', targetText: '', presetTexts: ['50', '100', '200', '500'], organizer: '', city: '' }
const short = (n: number) => (Number.isInteger(n) ? `$${n.toLocaleString('es-MX')}` : formatMoney(n))

export function GoalFormPage() {
  const params = useParams()
  const editingId = params.id ? Number(params.id) : null
  const navigate = useNavigate()
  const desktop = useIsAdminDesktop()
  const formId = useId()

  const [form, setForm] = useState<GoalForm>(EMPTY)
  const [current, setCurrent] = useState<{ status: GoalStatus; percentage: number; raisedAmount: number } | null>(null)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [loadError, setLoadError] = useState<unknown>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [loading, setLoading] = useState(editingId !== null)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState<string | null>(null) // texto del monto que se está agregando

  // En modo edición cargamos la meta y llenamos el formulario.
  useEffect(() => {
    if (editingId === null) {
      setForm(EMPTY)
      setCurrent(null)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    adminApi
      .getGoal(editingId)
      .then((g) => {
        if (!alive) return
        setForm({ title: g.title, description: g.description ?? '', targetText: formatAmountInput(g.targetAmount), presetTexts: g.presetAmounts.map(String), organizer: g.organizer ?? '', city: g.city ?? '' })
        setCurrent({ status: g.status, percentage: g.percentage, raisedAmount: g.raisedAmount })
      })
      .catch((e) => alive && setLoadError(e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [editingId])

  const set = <K extends keyof GoalForm>(k: K, v: GoalForm[K], errKey: string) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [errKey]: undefined }))
  }
  const removePreset = (i: number) => set('presetTexts', form.presetTexts.filter((_, j) => j !== i), 'presetAmounts')
  const confirmAdd = () => {
    if (adding === null) return
    const n = parseAmount(adding)
    if (n === null || n <= 0 || /\.\d{3,}/.test(adding)) {
      setErrors((e) => ({ ...e, presetAmounts: 'Escribe un monto mayor a $0 (máx. 2 decimales)' }))
      return
    }
    if (!form.presetTexts.some((t) => parseAmount(t) === n)) set('presetTexts', [...form.presetTexts, String(n)], 'presetAmounts')
    setAdding(null)
  }
  const onAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmAdd()
    } else if (e.key === 'Escape') setAdding(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const v = validateGoal(form)
    setErrors(v)
    if (!isEmpty(v)) return
    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      targetAmount: parseAmount(form.targetText)!,
      // Ignoramos casillas vacías, quitamos repetidos y ordenamos de menor a mayor.
      presetAmounts: [...new Set(form.presetTexts.filter((t) => t.trim()).map((t) => parseAmount(t)!))].sort((a, b) => a - b),
      organizer: form.organizer.trim() || null,
      city: form.city.trim() || null,
    }
    setSaving(true)
    try {
      const saved = editingId === null ? await adminApi.createGoal(body) : await adminApi.updateGoal(editingId, body)
      navigate(`/admin/metas/${saved.id}`)
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length) {
        // El backend puede mandar campos como "presetAmounts[2]": los agrupamos.
        const mapped: Record<string, string> = {}
        for (const [f, m] of Object.entries(err.fieldErrors)) mapped[f.replace(/\[\d+\]$/, '')] = m
        setErrors(mapped)
      }
      setSubmitError(err)
    } finally {
      setSaving(false)
    }
  }

  const title = editingId ? 'Editar meta' : 'Nueva meta'
  const backTo = editingId ? `/admin/metas/${editingId}` : '/admin'
  if (loading) return <>{!desktop && <AppBar title={title} backTo={backTo} />}<Spinner label="Cargando meta…" /></>
  if (loadError) return <>{!desktop && <AppBar title={title} backTo={backTo} />}<ErrorAlert error={loadError} /></>

  const presets = form.presetTexts.filter((t) => t.trim()).map((t) => parseAmount(t)).filter((n): n is number => n !== null)
  const target = parseAmount(form.targetText) ?? 0
  const status = current?.status ?? 'OPEN'

  // ---- bloques compartidos ----
  const presetEditor = (
    <div className="ui-field">
      <span className="ui-label" id={`${formId}-presets`}>Montos predeterminados</span>
      <div className="flex flex-wrap gap-2.5 rounded-xl border-[1.5px] border-dashed border-line bg-[#FAFBFB] p-3" role="group" aria-labelledby={`${formId}-presets`}>
        {form.presetTexts.map((p, i) =>
          p.trim() ? (
            <span key={`${p}-${i}`} className="ui-tag tabular-nums">
              {parseAmount(p) !== null ? short(parseAmount(p)!) : p}
              <button type="button" onClick={() => removePreset(i)} aria-label={`Quitar monto ${p}`}><XIcon className="size-3" /></button>
            </span>
          ) : null,
        )}
        {adding !== null ? (
          <span className="ui-tag !bg-white !pr-1.5">
            $
            <input
              autoFocus
              inputMode="decimal"
              aria-label="Nuevo monto sugerido"
              className="w-20 bg-transparent outline-none"
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={onAddKey}
              onBlur={() => (adding.trim() ? confirmAdd() : setAdding(null))}
            />
          </span>
        ) : (
          presets.length < LIMITS.presets && (
            <button type="button" onClick={() => setAdding('')} className="ui-tag !border-dashed !border-brand-600 !bg-white !px-3">
              <PlusIcon className="size-3.5" /> Agregar monto
            </button>
          )
        )}
      </div>
      <span className={`t-cap ${errors.presetAmounts ? '!text-expired' : '!text-ink-400'}`}>
        {errors.presetAmounts ?? `Son los botones que verá quien aporte. Máximo ${LIMITS.presets} montos.`}
      </span>
    </div>
  )
  const statusInfo = (
    <span className="t-cap !text-ink-400">
      Se cierra al llegar al 100%
    </span>
  )
  const fields = (
    <>
      <TextField label="Título" value={form.title} maxLength={LIMITS.title} showCount={false} onChange={(e) => set('title', e.target.value, 'title')} error={errors.title} placeholder="Ej. Rescate animal Huellitas" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <TextField label="Organiza (opcional)" value={form.organizer} maxLength={LIMITS.organizer} showCount={false} onChange={(e) => set('organizer', e.target.value, 'organizer')} error={errors.organizer} placeholder="Ej. Familia Ramírez" />
        <TextField label="Ciudad (opcional)" value={form.city} maxLength={LIMITS.city} showCount={false} onChange={(e) => set('city', e.target.value, 'city')} error={errors.city} placeholder="Ej. Puebla, Pue." />
      </div>
      <TextArea label="Descripción" value={form.description} maxLength={LIMITS.description} onChange={(e) => set('description', e.target.value, 'description')} error={errors.description} placeholder="Cuenta para qué es la meta y a quién ayuda." className="!h-[120px] !text-[15px] !leading-[23px]" />
    </>
  )
  const targetField = (
    <TextField label="Monto objetivo (MXN)" inputMode="decimal" prefix="$" value={form.targetText} onChange={(e) => set('targetText', e.target.value, 'targetAmount')}
      // Al salir del campo lo mostramos como "12,500.00"; al guardar se envía como número (parseAmount quita las comas).
      onBlur={() => { const n = parseAmount(form.targetText); if (n !== null && hasMax2Decimals(form.targetText)) setForm((f) => ({ ...f, targetText: formatAmountInput(n) })) }}
      error={errors.targetAmount} placeholder="10,000.00" />
  )

  if (!desktop)
    return (
      <form id={formId} onSubmit={onSubmit} noValidate className="pb-28">
        <AppBar title={title} backTo={backTo} />
        <div className="ui-content" style={{ gap: 16 }}>
          {fields}
          {targetField}
          {presetEditor}
          <div className="ui-card ui-card-flat !flex-row items-center justify-between" style={{ padding: '12px 14px' }}>
            <div className="flex flex-col gap-0.5"><span className="t-strong">Estado</span>{statusInfo}</div>
            <StatusBadge status={status} percentage={current?.percentage} />
          </div>
          <ErrorAlert error={submitError} />
        </div>
        <div className="ui-bottombar !flex-row !gap-3">
          <ButtonLink to={backTo} variant="secondary" className="!w-[120px] shrink-0">Cancelar</ButtonLink>
          <Button type="submit" loading={saving}>Guardar meta</Button>
        </div>
      </form>
    )

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <nav className="t-crumb" aria-label="Ruta">
          <Link to="/admin" className="hover:text-ink-700">Metas</Link><span className="mx-1.5">/</span><span>{title}</span>
        </nav>
        <div className="flex items-center justify-between gap-4">
          <h1 className="t-h1">{title}</h1>
          <div className="flex gap-3">
            <ButtonLink to={backTo} variant="secondary" size="sm" className="!w-[120px]">Cancelar</ButtonLink>
            <Button type="submit" form={formId} size="sm" loading={saving} className="!w-40">Guardar meta</Button>
          </div>
        </div>
      </div>
      <div className="flex items-start gap-6">
        <form id={formId} onSubmit={onSubmit} noValidate className="ui-card min-w-0 flex-1" style={{ padding: 28, gap: 22 }}>
          <h2 className="t-h3">Información de la meta</h2>
          {fields}
          <div className="flex items-start gap-4">
            {targetField}
            <div className="ui-field">
              <span className="ui-label">Estado</span>
              <div className="ui-input justify-between">
                <StatusBadge status={status} percentage={current?.percentage} />
                {statusInfo}
              </div>
            </div>
          </div>
          {presetEditor}
          <ErrorAlert error={submitError} />
        </form>

        <aside className="flex w-[380px] shrink-0 flex-col gap-3">
          <span className="t-small tracking-[.06em] text-ink-400">VISTA PREVIA EN MÓVIL</span>
          <GoalCard
            asLink={false}
            goal={{ id: editingId ?? 0, title: form.title.trim() || 'Título de la meta', status, raisedAmount: current?.raisedAmount ?? 0, targetAmount: target, percentage: current?.percentage ?? 0 }}
            extra={
              presets.length > 0 && (
                <div className="ui-amounts" aria-label="Montos sugeridos">
                  {presets.slice(0, 4).map((p, i) => <span key={`${p}-${i}`} className="ui-amt !h-11 !text-[15px]">{short(p)}</span>)}
                </div>
              )
            }
          />
          <div className="ui-card ui-card-flat !flex-row !gap-2.5 !border-brand-100 !bg-brand-50">
            <ShieldIcon className="mt-0.5 size-[18px] shrink-0 text-brand-700" />
            <span className="t-body !text-brand-700">Los pagos se cobran con QR de CoDi vía Pey. Cada QR vence en 20 minutos.</span>
          </div>
        </aside>
      </div>
    </>
  )
}
