/** Indicador de carga con texto para lectores de pantalla. */
export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="t-body flex flex-col items-center justify-center gap-3 py-16">
      <span className="size-8 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" aria-hidden />
      <span>{label}</span>
    </div>
  )
}
