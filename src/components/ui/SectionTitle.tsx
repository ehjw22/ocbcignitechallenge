import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/format'

/** Bold ~1.4rem section heading ("Manage", "Services", "Recent transactions"). */
export function SectionTitle({ className, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('ocbc-section-title', className)} {...rest} />
}
