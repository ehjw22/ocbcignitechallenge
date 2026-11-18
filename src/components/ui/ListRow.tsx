import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/format'

type Props = {
  children: ReactNode
  to?: string
  onClick?: () => void
  icon?: ReactNode
  trailing?: ReactNode
  chevron?: boolean
  className?: string
  'data-guide'?: string
  'aria-label'?: string
}

/** Full-width row with a thin divider and a right chevron. Renders a Link when `to` is set, else a button. */
export function ListRow({ children, to, onClick, icon, trailing, chevron = true, className, ...rest }: Props) {
  const body = (
    <>
      {icon}
      <span className="min-w-0 flex-1">{children}</span>
      {trailing}
      {chevron && <ChevronRight aria-hidden="true" size={22} strokeWidth={1.5} className="shrink-0" />}
    </>
  )
  if (to) return <Link to={to} onClick={onClick} className={cn('ocbc-list-row', className)} {...rest}>{body}</Link>
  return <button type="button" onClick={onClick} className={cn('ocbc-list-row', className)} {...rest}>{body}</button>
}
