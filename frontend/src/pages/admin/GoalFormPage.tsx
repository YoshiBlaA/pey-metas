// 10 · Crear / editar meta. La misma pantalla sirve para ambas cosas según haya :id.
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApiError, adminApi } from '../../api'
import { TextArea, TextField } from '../../components/Field'
import { Button, ButtonLink } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { LIMITS, isEmpty, parseAmount, validateGoal, type GoalForm } from '../../lib/validation'

const EMPTY: GoalForm = { title: '', description: '', targetText: '', presetTexts: ['50', '100', '200', '500'] }

export function GoalFormPage() {
  const params = useParams()
  const editingId = params.id ? Number(params.id) : null
  const navigate = useNavigate()

  const [form, setForm] = useState<GoalForm>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [loadError, setLoadError] = useState<unknown>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [loading, setLoading] = useState(editingId !== null)
  const [saving, setSaving] = useState(false)

  // En modo edición cargamos la meta y llenamos el formulario.
  useEffect(() => {
    if (editingId === null) {
      setForm(EMPTY)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    adminApi
      .getGoal(editingId)
      .then((g) => {
        if (!alive) return
        setForm({
          title: g.title,
          description: g.description ?? '',
          targetText: String(g.targetAmount),
          presetTexts: g.presetAmounts.map(String),
        })
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
  const setPreset = (i: number, v: string) =>
    set('presetTexts', form.presetTexts.map((p, j) => (j === i ? v : p)), 'presetAmounts')
  const removePreset = (i: number) => set('presetTexts', form.presetTexts.filter((_, j) => j !== i), 'presetAmounts')
  const addPreset = () => set('presetTexts', [...form.presetTexts, ''], 'presetAmounts')

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

  if (loading) return <Spinner label="Cargando meta…" />
  if (loadError) return <ErrorAlert error={loadError} />

  const filledPresets = form.presetTexts.filter((t) => t.trim()).length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <ButtonLink to={editingId ? `/admin/metas/${editingId}` : '/admin'} variant="ghost" size="sm">← Volver</ButtonLink>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{editingId ? 'Editar meta' : 'Nueva meta'}</h1>
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-6 rounded-2xl border border-line bg-card p-8 shadow-sm">
        <TextField
          label="Título"
          value={form.title}
          maxLength={LIMITS.title}
          onChange={(e) => set('title', e.target.value, 'title')}
          error={errors.title}
          placeholder="Ej. Laptop para Sofía"
        />
        <TextArea
          label="Descripción"
          rows={5}
          value={form.description}
          maxLength={LIMITS.description}
          onChange={(e) => set('description', e.target.value, 'description')}
          error={errors.description}
          placeholder="Cuenta para qué es la meta y a quién ayuda."
        />
        <TextField
          label="Monto objetivo (MXN)"
          inputMode="decimal"
          value={form.targetText}
          onChange={(e) => set('targetText', e.target.value, 'targetAmount')}
          error={errors.targetAmount}
          placeholder="12500"
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-ink-700">
            Montos sugeridos <span className="text-ink-400">({filledPresets}/{LIMITS.presets})</span>
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {form.presetTexts.map((p, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  aria-label={`Monto sugerido ${i + 1}`}
                  inputMode="decimal"
                  value={p}
                  onChange={(e) => setPreset(i, e.target.value)}
                  className="w-full rounded-xl border border-ink-300 px-3 py-2 tabular-nums focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => removePreset(i)}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-expired-bg hover:text-expired"
                  aria-label={`Quitar monto sugerido ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {errors.presetAmounts && <p className="text-sm text-expired">{errors.presetAmounts}</p>}
          <Button type="button" variant="secondary" size="sm" onClick={addPreset} disabled={form.presetTexts.length >= LIMITS.presets}>
            + Agregar monto
          </Button>
        </fieldset>

        <ErrorAlert error={submitError} />

        <div className="flex justify-end gap-3 border-t border-line pt-6">
          <ButtonLink to="/admin" variant="secondary">Cancelar</ButtonLink>
          <Button type="submit" loading={saving}>{editingId ? 'Guardar cambios' : 'Crear meta'}</Button>
        </div>
      </form>
    </div>
  )
}
