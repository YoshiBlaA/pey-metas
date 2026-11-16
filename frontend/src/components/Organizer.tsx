import { organizerLine } from '../lib/format'

/** "Organiza: X · Ciudad" bajo el título (solo si la meta trae alguno de los dos). */
export function Organizer({ goal, className = '' }: { goal: { organizer?: string | null; city?: string | null }; className?: string }) {
  const line = organizerLine(goal.organizer, goal.city)
  return line ? <p className={`t-cap ${className}`}>{line}</p> : null
}
