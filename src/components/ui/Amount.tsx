import { cn, formatMoney } from '../../lib/format'

/** "1,230.55 SGD" with a large number and a small currency, as in the OCBC app. Display only. */
export function Amount({ value, size = '2rem', negative = false, className }: { value: number; size?: string; negative?: boolean; className?: string }) {
  const [num, cur] = formatMoney(value).split(' ')
  return (
    <span className={cn('inline-flex items-baseline gap-1 font-bold', className)}>
      <span style={{ fontSize: size, lineHeight: 1.15 }}>{negative ? '-' : ''}{num}</span>
      <span className="font-normal" style={{ fontSize: `calc(${size} * 0.45)` }}>{cur}</span>
    </span>
  )
}