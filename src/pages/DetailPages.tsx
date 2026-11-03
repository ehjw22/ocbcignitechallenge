import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Page } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { NOTIFICATIONS, payeeName } from '@/data/bank'
import { translate } from '@/i18n'
import { CircleDollarSign, FileText, Info, LockKeyhole, SlidersHorizontal } from 'lucide-react'
import { formatMoney, formatSGD, formatTxnAmount } from '@/lib/format'

export function AccountDetail() {
  const { accountId = '' } = useParams()
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const account = app.accounts.find((item) => item.id === accountId)
  useEffect(() => { app.setScreen('account') }, [])
  if (!account) {
    return (
      <Page title={t('accounts.title')} back>
        <p className="p-4">{t('notFound.body')}</p>
      </Page>
    )
  }
  const balance = account.kind === 'card' ? account.balance : app.balances[account.id] ?? account.balance
  const txns = app.txns.filter((txn) => txn.accountId === account.id)
  return (
    <Page title="" back>
      <div className="bg-gradient-to-b from-[#F8F1F3] to-[var(--bg)] px-4 pb-4">
        <h1 className="text-[22px] font-bold">{t(account.nameKey)}</h1>
        <p className="text-[13px] text-[var(--muted)]">{account.number}</p>
        <p className="text-[13px] text-[var(--muted)]">{app.profile.name}</p>
        <div className="mt-4 grid grid-cols-3 text-center text-[12px] font-semibold">
          <Link to="/flow/transfer" className="flex flex-col items-center gap-1"><CircleDollarSign size={22} strokeWidth={1.5} />{t('flows.transfer')}</Link>
          <Link to="/flow/limit" className="flex flex-col items-center gap-1"><SlidersHorizontal size={22} strokeWidth={1.5} />{t('flows.limit')}</Link>
          <Link to="/info/money-lock" className="flex flex-col items-center gap-1"><LockKeyhole size={22} strokeWidth={1.5} />{t('look.moneyLock')}</Link>
        </div>
        <p className="mt-4 text-[13px] text-[var(--muted)]">{t('look.total')}</p>
        <p className="text-[18px] font-bold">{formatMoney(balance)}</p>
        <p className="mt-2 text-[13px] text-[var(--muted)]">{t('look.available')}</p>
        <p className="text-[18px] font-bold">{formatMoney(balance)}</p>
      </div>
      <div className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-bold">{t('recent')}</h2>
          <span className="flex items-center gap-2">
            <button type="button" data-guide="txn-search" className="text-[13px] font-semibold text-[var(--link)] underline" aria-label={t('tour.txnsTitle')}>{t('look.viewStatement')}</button>
            <FileText size={16} className="text-[var(--link)]" />
          </span>
        </div>
        <p className="mb-3 flex gap-2 rounded-lg bg-[#E3E1F0] p-3 text-[13px]"><Info size={16} className="shrink-0 text-[#3B5BDB]" />{t('look.pending')}</p>
        <ul className="divide-y divide-[var(--line)] rounded-xl bg-[var(--card)]">
          {txns.map((txn) => (
            <li key={txn.id}>
              <Link to={`/txn/${txn.id}`} className="flex items-center justify-between px-3 py-3">
                <span className="text-[12px] font-semibold uppercase">{payeeName(txn.title)}</span>
                <span className={`text-[15px] font-bold tabular-nums ${txn.amount > 0 ? 'text-[#1E8E3E]' : ''}`}>{formatTxnAmount(txn.amount)}</span>
              </Link>
            </li>
          ))}
          {txns.length === 0 && <li className="px-3 py-3 text-[var(--muted)]">{t('txn.none')}</li>}
        </ul>
      </div>
    </Page>
  )
}

export function TxnDetail() {
  const { txnId = '' } = useParams()
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const txn = app.txns.find((item) => item.id === txnId)
  useEffect(() => { app.setScreen('transaction') }, [])
  if (!txn) {
    return (
      <Page title={t('txn.title')} back>
        <p className="p-4">{t('notFound.body')}</p>
      </Page>
    )
  }
  const account = app.accounts.find((item) => item.id === txn.accountId)
  return (
    <Page title={t('txn.title')} back>
      <article className="card m-4 space-y-3 p-4">
        <h2 className="text-xl font-semibold leading-normal">{payeeName(txn.title)}</h2>
        <p className="text-2xl font-bold tabular-nums">{formatSGD(txn.amount)}</p>
        <p><span className="text-[var(--muted)]">{t('success.when')}</span> {txn.date}</p>
        <p><span className="text-[var(--muted)]">{t('flows.from')}</span> {account ? t(account.nameKey) : txn.accountId}</p>
        <p><span className="text-[var(--muted)]">{t('success.reference')}</span> {txn.id}</p>
      </article>
    </Page>
  )
}

export function Notifications() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  useEffect(() => { app.setScreen('notifications') }, [])
  return (
    <Page title={t('notifications.title')} back>
      <ul className="divide-y divide-[var(--line)] bg-[var(--card)]">
        {NOTIFICATIONS.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <p className="font-semibold leading-normal">{t(item.title)}</p>
            <p className="leading-normal">{t(item.body)}</p>
            <p className="text-sm text-[var(--muted)]">{item.date}</p>
          </li>
        ))}
      </ul>
    </Page>
  )
}

export function Profile() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  useEffect(() => { app.setScreen('profile') }, [])
  return (
    <Page title={t('profile.title')} back>
      <div className="space-y-3 p-4">
        <article className="card p-4">
          <p className="text-2xl font-semibold leading-normal">{app.profile.shortName}</p>
          <p>{app.profile.name}</p>
        </article>
        <Link to="/settings" className="ocbc-btn">{t('more.settings')}</Link>
        <button type="button" className="min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 font-semibold" onClick={app.logout}>
          {t('gate.logout')}
        </button>
      </div>
    </Page>
  )
}

export function NotFound() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  return (
    <main id="main" className="flex h-full flex-col items-start justify-center gap-3 bg-[var(--bg)] p-6 text-[var(--text)]">
      <h1 className="text-2xl font-semibold">{t('notFound.title')}</h1>
      <p>{t('notFound.body')}</p>
      <Link to="/" className="ocbc-btn">{t('notFound.home')}</Link>
    </main>
  )
}
