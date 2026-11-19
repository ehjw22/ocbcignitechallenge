import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/format'

/** Fully rounded pill. Active = accent fill; inactive = white with dark outline. */
export function Pill({ active = false, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return <button type={type} aria-pressed={active} className={cn('ocbc-pill', active && 'is-active', className)} {...rest} />
}
