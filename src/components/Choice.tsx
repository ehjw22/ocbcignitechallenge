import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

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
      className={`mb-2 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left ${
        selected
          ? 'border-2 border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,var(--card))] font-bold'
          : 'border border-[#d9d9d9] bg-[var(--card)] font-medium'
      }`}
      onClick={onClick}
    >
      <span className="min-w-0">{children}</span>
      {selected && <Check aria-hidden size={18} className="shrink-0 text-[var(--accent)]" />}
    </button>
  )
}
