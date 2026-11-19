import { forwardRef } from 'react'
import { formatMoney, localeFor } from '@/lib/format'

export type SuccessReceiptData = {
  amount: number
  payeeName: string
  reference: string
  when: string
  fromLabel: string
  practice: boolean
}

export const SuccessReceipt = forwardRef<
  HTMLDivElement,
  { data: SuccessReceiptData; paidLabel: string; practiceLabel: string; refLabel: string; whenLabel: string; fromLabel: string }
>(function SuccessReceipt({ data, paidLabel, practiceLabel, refLabel, whenLabel, fromLabel }, ref) {
    return (
      <div ref={ref} className="w-[320px] max-w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 text-[var(--text)] shadow-md">
        {data.practice && (
          <p className="mb-2 rounded-lg bg-[var(--soft)] px-2 py-1 text-center text-xs font-semibold text-[var(--warn)]">{practiceLabel}</p>
        )}
        <p className="text-center text-3xl font-bold text-[var(--success)]" aria-hidden>
          ✓
        </p>
        <p className="mt-2 text-center text-lg font-bold leading-snug">{paidLabel}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--muted)]">{refLabel}</dt>
            <dd className="font-semibold">{data.reference}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--muted)]">{whenLabel}</dt>
            <dd className="font-semibold">{data.when}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[var(--muted)]">{fromLabel}</dt>
            <dd className="min-w-0 text-right font-semibold">{data.fromLabel}</dd>
          </div>
        </dl>
      </div>
    )
  },
)

export function receiptWhenLabel(language: string) {
  return new Intl.DateTimeFormat(localeFor(language), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())
}

export function receiptPaidText(amount: number, payeeName: string, language = 'en') {
  return `${formatMoney(amount, language)} sent to ${payeeName}`
}