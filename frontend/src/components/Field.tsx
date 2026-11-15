import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

interface Common {
  label: string
  error?: string
  hint?: string
  /** Si se pasa, muestra el contador "12 / 60 caracteres". */
  maxLength?: number
  /** Ícono o prefijo dentro del campo (p. ej. "$"). */
  prefix?: ReactNode
  suffix?: ReactNode
}

/** Etiqueta + mensajes compartidos por TextField y TextArea. */
function Wrapper({ id, label, error, hint, count, maxLength, children }: Common & { id: string; count: number; children: ReactNode }) {
  return (
    <div className="ui-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="t-cap !text-expired">{error}</p>
      ) : hint || maxLength !== undefined ? (
        <p id={`${id}-msg`} className="t-cap !text-ink-400">
          {hint}
          {hint && maxLength !== undefined ? ' · ' : ''}
          {maxLength !== undefined && `${count} / ${maxLength} caracteres`}
        </p>
      ) : null}
    </div>
  )
}

/** Input del Figma (52px, radio 12, borde 1.5px, foco 2px verde) con etiqueta y error accesibles. */
export function TextField({ label, error, hint, maxLength, prefix, suffix, className = '', ...rest }: Common & Omit<InputHTMLAttributes<HTMLInputElement>, 'maxLength' | 'prefix'>) {
  const id = useId()
  const count = String(rest.value ?? '').length
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} maxLength={maxLength} count={count}>
      <div className={`ui-input ${error ? 'invalid' : ''} ${className}`}>
        {prefix && <span className="text-ink-400" aria-hidden>{prefix}</span>}
        <input
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || hint || maxLength !== undefined ? `${id}-msg` : undefined}
          {...rest}
        />
        {suffix}
      </div>
    </Wrapper>
  )
}

export function TextArea({ label, error, hint, maxLength, prefix: _p, suffix: _s, className = "", ...rest }: Common & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'maxLength' | 'prefix'>) {
  const id = useId()
  const count = String(rest.value ?? '').length
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} maxLength={maxLength} count={count}>
      <div className={`ui-input area ${error ? 'invalid' : ''} ${className}`}>
        <textarea
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || hint || maxLength !== undefined ? `${id}-msg` : undefined}
          {...rest}
        />
      </div>
    </Wrapper>
  )
}
