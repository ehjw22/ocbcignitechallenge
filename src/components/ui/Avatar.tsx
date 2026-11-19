import { cn } from '../../lib/format'

export function initials(name: string, max = 3) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, max)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase()
}

/** Dark slate circle with white initials (decorative; the name is shown next to it). */
export function Avatar({ name, text, size = '2.75rem', className }: { name?: string; text?: string; size?: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('ocbc-avatar', className)} style={{ width: size, height: size, fontSize: `calc(${size} * 0.32)` }}>
      {text ?? initials(name ?? '')}
    </span>
  )
}
