import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { cn } from '../../lib/format'

/** Blue underlined link (router link). */
export function TextLink({ className, ...rest }: LinkProps) {
  return <Link className={cn('ocbc-link', className)} {...rest} />
}

/** Blue underlined link that runs an action instead of navigating. */
export function TextButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cn('ocbc-link', className)} {...rest} />
}
