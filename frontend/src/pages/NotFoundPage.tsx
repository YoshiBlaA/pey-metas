import { ButtonLink } from '../components/Button'

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-extrabold text-brand-600">404</p>
      <h1 className="text-xl font-bold">No encontramos esta página</h1>
      <ButtonLink to="/">Ver metas</ButtonLink>
    </main>
  )
}
