import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/format'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }

/** OCBC-style full-width button: slate fill (primary) or outlined (secondary), underlined label. */
export function Button({ variant = 'primary', className, type = 'button', ...rest }: Props) {
  return <button type={type} className={cn(variant === 'primary' ? 'ocbc-btn' : 'ocbc-btn-secondary', className)} {...rest} />
}
