import type { RecentContribution } from '../api'
import { formatRelative, initials } from '../lib/format'
import { Money } from './Money'

/** Fila de una aportación: avatar con iniciales, nombre, mensaje, monto y hace cuánto. */
export function ContributionRow({ c }: { c: RecentContribution }) {
  const anonymous = c.name === 'Anónimo'
  return (
    <li className="flex gap-3 py-3">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${
          anonymous ? 'bg-closed text-ink-400' : 'bg-brand-100 text-brand-700'
        }`}
        aria-hidden
      >
        {anonymous ? '?' : initials(c.name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold">{c.name}</p>
          <Money amount={c.amount} className="shrink-0 font-semibold text-brand-700" />
        </div>
        {c.message && <p className="break-words text-sm text-ink-700">{c.message}</p>}
        <p className="text-xs text-ink-400">
          <time dateTime={c.paidAt}>{formatRelative(c.paidAt)}</time>
        </p>
      </div>
    </li>
  )
}
