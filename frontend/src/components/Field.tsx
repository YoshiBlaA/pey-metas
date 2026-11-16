import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

interface Common {
  label: string
  error?: string
  hint?: string
  /** Límite de caracteres (se pasa al input). */
  maxLength?: number
  /** Muestra el contador "12 / 60 caracteres" a la derecha (por defecto sí, si hay maxLength). */
  showCount?: boolean
  /** Ícono o prefijo dentro del campo (p. ej. "$"). */
  prefix?: ReactNode
  suffix?: ReactNode
}

/** Etiqueta + mensajes compartidos por TextField y TextArea. */
function Wrapper({ id, label, error, hint, count, maxLength, showCount = true, children }: Common & { id: string; count: number; children: ReactNode }) {
  const counter = showCount && maxLength !== undefined
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="t-cap !text-expired">{error}</p>
      ) : hint || counter ? (
        <p id={`${id}-msg`} className={`t-cap !text-ink-400 ${hint ? '' : 'text-right'}`}>
          {hint}
          {hint && counter ? ' · ' : ''}
          {counter && `${count} / ${maxLength} caracteres`}
        </p>
      ) : null}
    </div>
  )
}

/** Input del Figma (52px, radio 12, borde 1.5px, foco 2px verde) con etiqueta y error accesibles. */
export function TextField({ label, error, hint, maxLength, showCount, prefix, suffix, className = '', ...rest }: Common & Omit<InputHTMLAttributes<HTMLInputElement>, 'maxLength' | 'prefix'>) {
  const id = useId()
  const count = String(rest.value ?? '').length
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} maxLength={maxLength} showCount={showCount} count={count}>
      <div className={`ui-input ${error ? 'invalid' : ''} ${className}`}>
        {/* Un "$" de texto va pegado como en el diseño ("$ 0.00"); los íconos usan el gap de 10px. */}
        {prefix && <span className={`text-ink-400 ${typeof prefix === 'string' ? '-mr-1.5' : ''}`} aria-hidden>{prefix}</span>}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || hint || (showCount !== false && maxLength !== undefined) ? `${id}-msg` : undefined}
          maxLength={maxLength}
          {...rest}
        />
        {suffix}
      </div>
    </Wrapper>
  )
}

export function TextArea({ label, error, hint, maxLength, showCount, prefix: _p, suffix: _s, className = "", ...rest }: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'maxLength' | 'prefix'>) {
  const id = useId()
  const count = String(rest.value ?? '').length
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} maxLength={maxLength} showCount={showCount} count={count}>
      <div className={`ui-input area ${error ? 'invalid' : ''} ${className}`}>
        <textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || hint || (showCount !== false && maxLength !== undefined) ? `${id}-msg` : undefined}
          maxLength={maxLength}
          {...rest}
        />
      </div>
    </Wrapper>
  )
}
