import type { RecentContribution } from '../api'
import { formatRelative, initials } from '../lib/format'
import { Money } from './Money'
import { HeartIcon } from './Icons'

/** Avatar circular con iniciales (o corazón si es anónima). */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const anonymous = name === 'Anónimo'
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold ${anonymous ? 'bg-closed text-brand-700' : 'bg-brand-100 text-brand-700'}`}
      style={{ width: size, height: size, fontSize: size <= 32 ? 11 : 13 }}
      aria-hidden
    >
      {anonymous ? <HeartIcon className="size-3.5 text-ink-400" /> : initials(name)}
    </span>
  )
}

/** Fila de una aportación: avatar, nombre, mensaje, monto y hace cuánto. */
export function ContributionRow({ c }: { c: RecentContribution }) {
  return (
    <li className="flex gap-3 py-3">
      <Avatar name={c.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="t-strong truncate">{c.name}</p>
          <Money amount={c.amount} className="t-strong shrink-0 text-brand-700" />
        </div>
        {c.message && <p className="t-body break-words !text-ink-900">{c.message}</p>}
        <p className="t-cap !text-ink-400">
          <time dateTime={c.paidAt}>{formatRelative(c.paidAt)}</time>
        </p>
      </div>
    </li>
  )
}
