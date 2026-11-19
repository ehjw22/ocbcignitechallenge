import type { ReactNode } from 'react'
import { cn } from '../../lib/format'

/** Light grey circle that holds a thin line icon (quick actions, Apply grid, Customise). */
export function IconCircle({ children, size = '3.25rem', className }: { children: ReactNode; size?: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('ocbc-icon-circle', className)} style={{ width: size, height: size }}>
      {children}
    </span>
  )
}