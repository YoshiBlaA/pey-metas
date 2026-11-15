import { errorMessage } from '../api'

/** Caja de error accesible (role="alert" para que se anuncie al aparecer). */
export function ErrorAlert({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null
  return (
    <div role="alert" className="t-body rounded-xl border border-expired/20 bg-expired-bg p-4 !text-expired">
      <p>{typeof error === 'string' ? error : errorMessage(error)}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold underline underline-offset-2">
          Reintentar
        </button>
      )}
    </div>
  )
}
