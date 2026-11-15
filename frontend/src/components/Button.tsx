import { Link, type LinkProps } from 'react-router-dom'
import type { ButtonHTMLAttributes } from 'react'

// Medidas del Figma (clases .ui-btn en index.css): 52px radio 14; "sm" 44px radio 12.
type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger'
type Size = 'md' | 'sm'

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `ui-btn ${variant} ${size === 'sm' ? 'sm' : ''} ${extra}`

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

/** Botón reutilizable. `loading` lo deshabilita y muestra un indicador. */
export function Button({ variant, size, loading, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
}

/** Un Link con apariencia de botón (para navegar, no para acciones). */
export function ButtonLink({ variant, size, className = '', ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />
}
