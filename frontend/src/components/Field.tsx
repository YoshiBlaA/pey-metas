import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface Common {
  label: string
  error?: string
  hint?: string
  /** Si se pasa, muestra el contador "12/60". */
  maxLength?: number
}

const inputCls = (error?: string) =>
  `w-full rounded-xl border bg-white px-3.5 py-2.5 text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 ${
    error ? 'border-red-400 focus:ring-red-200' : 'border-ink-300 focus:border-brand-500 focus:ring-brand-100'
  }`

/** Encabezado + mensajes compartidos por TextField y TextArea. */
function Wrapper({ id, label, error, hint, count, maxLength, children }: Common & { id: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium text-ink-700">{label}</label>
        {maxLength !== undefined && count !== undefined && (
          <span className={`text-xs tabular-nums ${count > maxLength ? 'text-red-600' : 'text-ink-500'}`}>{count}/{maxLength}</span>
        )}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}

/** Input con etiqueta, ayuda y error conectados por aria-describedby (accesible). */
export function TextField({ label, error, hint, maxLength, ...rest }: Common & Omit<InputHTMLAttributes<HTMLInputElement>, 'maxLength'>) {
  const id = useId()
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} maxLength={maxLength} count={String(rest.value ?? '').length}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={inputCls(error)}
        {...rest}
      />
    </Wrapper>
  )
}

export function TextArea({ label, error, hint, maxLength, ...rest }: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'maxLength'>) {
  const id = useId()
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} maxLength={maxLength} count={String(rest.value ?? '').length}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={inputCls(error)}
        {...rest}
      />
    </Wrapper>
  )
}
