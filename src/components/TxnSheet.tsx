import { useEffect, useRef } from 'react'
import type { Account, Txn } from '@/lib/types'
import { formatSignedMoney } from '@/lib/format'
import { payeeName } from '@/data/bank'

export function txnKind(title: string) {
  const value = title.toLowerCase()
  if (/salary|allowance/.test(value)) return 'look.kindIncoming'
  if (/netflix|spotify|youtube/.test(value)) return 'look.kindCard'
  if (/grab|hawker|kopitiam|food|fairprice/.test(value)) return 'look.kindQr'
  if (/giro|sp group/.test(value)) return 'look.kindBill'
  return 'look.kindFast'
}

export function TxnSheet({
  txn,
  account,
  language,
  t,
  onClose,
}: {
  txn: Txn
  account?: Account
  language: string
  t: (key: string) => string
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="absolute inset-0 z-40 bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        data-guide="txn-sheet"
        className="absolute inset-x-0 bottom-0 max-h-[85%] overflow-y-auto rounded-t-2xl bg-[var(--card)] px-4 pb-6 pt-3 text-[var(--text)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--line)]" />
        <div className="flex items-start justify-between gap-3">
          <h2 className="min-w-0 pt-2 text-[1.05rem] font-bold uppercase">{t(txnKind(txn.title))}</h2>
          <button ref={closeRef} type="button" className="min-h-11 shrink-0 px-1 text-[var(--link)] underline" onClick={onClose}>{t('close')}</button>
        </div>
        <p>{account ? t(account.nameKey) : ''} {account ? `•••• ${account.number.slice(-4)}` : ''}</p>
        <p>{new Intl.DateTimeFormat(language.startsWith('zh') ? 'zh-CN' : 'en-SG', { day: 'numeric', month: language.startsWith('zh') ? 'long' : 'short', year: 'numeric' }).format(new Date(`${txn.date}T00:00:00`))}</p>
        <p className="mt-1 text-[1.75rem] font-bold">{formatSignedMoney(txn.amount)}</p>
        <p className="mt-3 text-[0.85rem] text-[var(--muted)]">{t('look.description')}</p>
        <p className="border-l-4 border-[var(--accent)] pl-3">{payeeName(txn.title)}</p>
      </div>
    </div>
  )
}
