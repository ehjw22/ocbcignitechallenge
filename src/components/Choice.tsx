import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

export function choiceClass(selected: boolean) {
  return `choice${selected ? ' is-on' : ''}`
}

export function Choice({
  selected,
  onClick,
  children,
  role = 'radio',
}: {
  selected: boolean
  onClick: () => void
  children: ReactNode
  role?: 'radio' | 'button'
}) {
  return (
    <button
      type="button"
      role={role === 'radio' ? 'radio' : undefined}
      aria-checked={role === 'radio' ? selected : undefined}
      aria-pressed={role === 'button' ? selected : undefined}
      className={`${choiceClass(selected)} mb-2 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left`}
      onClick={onClick}
    >
      <span className="min-w-0 leading-snug">{children}</span>
      <Check aria-hidden size={18} className={`shrink-0 text-[var(--accent)] ${selected ? 'opacity-100' : 'opacity-0'}`} />
    </button>
  )
}
