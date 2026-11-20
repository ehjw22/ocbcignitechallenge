import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

export function choiceClass(selected: boolean) {
  return `choice${selected ? ' is-on' : ''}`
}

/** Grid shell with a reserved tick column — use on raw buttons that mirror Choice layout. */
export function choiceRowClass(selected: boolean, extra?: string) {
  return `${choiceClass(selected)} grid min-h-11 min-w-0 grid-cols-[minmax(0,1fr)_1.125rem] items-center gap-2 rounded-xl px-3 py-2 text-left${extra ? ` ${extra}` : ''}`
}

export function Choice({
  selected,
  onClick,
  children,
  role = 'radio',
  variant = 'default',
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  role?: 'radio' | 'button'
  /** Compact: selected tint/border only, no separate tick (fits narrow grids). */
  variant?: 'default' | 'compact'
}) {
  const compact = variant === 'compact'
  return (
    <button
      type="button"
      role={role === 'radio' ? 'radio' : undefined}
      aria-checked={role === 'radio' ? selected : undefined}
      aria-pressed={role === 'button' ? selected : undefined}
      className={
        compact
          ? `${choiceClass(selected)} flex min-h-11 w-full min-w-0 items-center rounded-xl px-3 py-2 text-left`
          : `${choiceClass(selected)} mb-2 grid min-h-11 w-full min-w-0 grid-cols-[minmax(0,1fr)_1.125rem] items-center gap-2 rounded-xl px-3 py-2 text-left`
      }
      onClick={onClick}
    >
      <span className={`choice-label min-w-0 leading-snug${compact ? ' w-full' : ''}`}>{children}</span>
      {!compact && (
        <Check
          aria-hidden
          size={18}
          className={`shrink-0 justify-self-end text-[var(--accent)] ${selected ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </button>
  )
}