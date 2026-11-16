// 01 · Lista de metas (móvil 390×844).
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useIsDesktopWidth } from '../../hooks/useMediaQuery'
import { useGoalCounts } from '../../hooks/useGoalCounts'
import { publicApi, type GoalStatus } from '../../api'
import { useAsync } from '../../hooks/useAsync'
import { Logo } from '../../components/Layouts'
import { GoalCard } from '../../components/GoalCard'
import { Spinner } from '../../components/Spinner'
import { ErrorAlert } from '../../components/ErrorAlert'
import { SearchIcon, XIcon } from '../../components/Icons'

const FILTERS: { label: string; value: GoalStatus | undefined }[] = [
  { label: 'Todas', value: undefined },
  { label: 'Abiertas', value: 'OPEN' },
  { label: 'Logradas', value: 'CLOSED' },
]

export function GoalsListPage() {
  const [status, setStatus] = useState<GoalStatus | undefined>(undefined)
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const setQuery = (v: string) => setParams(v ? { q: v } : {}, { replace: true })
  const [searching, setSearching] = useState(query !== '')
  const desktop = useIsDesktopWidth()
  // El filtro se manda al backend (?status=OPEN|CLOSED); la búsqueda por texto es local.
  const { data: goals, error, loading, reload } = useAsync(() => publicApi.listGoals(status), [status])
  const q = query.trim().toLowerCase()
  const visible = goals?.filter((g) => !q || g.title.toLowerCase().includes(q))
  const counts = useGoalCounts(goals)

  const filters = (
    <div className="flex gap-2" role="group" aria-label="Filtrar metas">
      {FILTERS.map((f) => {
        const active = f.value === status
        return (
          <button
            key={f.label}
            aria-pressed={active}
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-4 font-semibold transition ${desktop ? 'h-10 text-[14px]' : 'h-[34px] text-[13px]'} ${active ? 'bg-accent-900 text-white' : 'border border-line bg-card text-ink-900 hover:bg-accent-50'}`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
  const results = (
    <>
      {loading && <Spinner label="Cargando metas…" />}
      {!loading && error ? <ErrorAlert error={error} onRetry={() => void reload()} /> : null}
      {!loading && !error && visible?.length === 0 && (
        <p className="ui-card t-body text-center">{q ? `Ninguna meta coincide con “${query}”.` : 'No hay metas por aquí todavía.'}</p>
      )}
    </>
  )

  if (desktop)
    return (
      <div className="flex flex-col gap-7 pt-8">
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[40px] font-extrabold leading-[48px]">Apoya <span className="lp-grad-text">una meta</span></h1>
            <p className="t-bodyL">Aporta en segundos con CoDi desde la app de tu banco. Sin comisiones.</p>
          </div>
          {filters}
        </div>
        <section aria-live="polite">
          {results}
          {!loading && !!visible?.length && (
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
              {visible.map((g) => <GoalCard key={g.id} goal={g} count={counts[g.id]} large />)}
            </div>
          )}
        </section>
      </div>
    )

  return (
    <>
      <header className="ui-appbar !h-16 !px-5">
        {searching ? (
          <div className="ui-input !h-11 flex-1">
            <SearchIcon className="size-4 text-ink-400" />
            <input autoFocus placeholder="Buscar meta…" aria-label="Buscar meta" value={query} onChange={(e) => setQuery(e.target.value)} className="text-[14px]" />
            <button onClick={() => { setQuery(''); setSearching(false) }} aria-label="Cerrar búsqueda"><XIcon className="size-4 text-ink-400" /></button>
          </div>
        ) : (
          <>
            <Logo />
            <button className="ui-iconbtn" aria-label="Buscar meta" onClick={() => setSearching(true)}>
              <SearchIcon className="size-[18px]" />
            </button>
          </>
        )}
      </header>

      <div className="ui-content" style={{ gap: 14, paddingTop: 4 }}>
        <section className="flex flex-col gap-1">
          <h1 className="t-h1" style={{ fontSize: 28, lineHeight: '36px' }}>Apoya <span className="lp-grad-text">una meta</span></h1>
          <p className="t-body">Aporta en segundos con CoDi desde la app de tu banco. Sin comisiones.</p>
        </section>

        {filters}

        <section className="flex flex-col gap-3.5" aria-live="polite">
          {results}
          {!loading && visible?.map((g) => <GoalCard key={g.id} goal={g} count={counts[g.id]} large padding={16} />)}
        </section>
        <nav className="t-cap flex justify-center gap-2 pt-2 !text-ink-400" aria-label="Ayuda">
          <Link to="/como-funciona" className="font-semibold text-brand-700">¿Cómo funciona?</Link>
          <span aria-hidden>·</span>
          <Link to="/preguntas-frecuentes" className="font-semibold text-brand-700">Preguntas frecuentes</Link>
        </nav>
      </div>
    </>
  )
}
