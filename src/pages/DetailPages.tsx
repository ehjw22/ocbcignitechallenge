import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Page } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { ACCOUNTS, NOTIFICATIONS, payeeName } from '@/data/bank'
import { translate } from '@/i18n'
import { formatSGD } from '@/lib/format'

export function AccountDetail() {
  const { accountId = '' } = useParams()
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const account = ACCOUNTS.find((item) => item.id === accountId)
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
    <Page title={t(account.nameKey)} back>
      <div className="space-y-3 px-4 py-4">
        <article className="card px-4 py-4">
          <p className="text-[0.75rem] text-[var(--muted)]">{account.kind === 'card' ? `•••• ${account.number}` : account.number}</p>
          <p className="mt-2 text-[1.8rem] font-bold leading-normal tabular-nums">{formatSGD(balance)}</p>
          <p className="text-[var(--muted)]">{account.kind === 'card' ? t('outstanding') : t('available')}</p>
        </article>
        <h2 className="text-lg font-semibold">{t('recent')}</h2>
        <ul className="card divide-y divide-[var(--line)]">
          {txns.map((txn) => (
            <li key={txn.id}>
              <Link to={`/txn/${txn.id}`} className="flex items-center justify-between px-3 py-3">
                <span>
                  <span className="block">{payeeName(txn.title)}</span>
                  <span className="text-sm text-[var(--muted)]">{txn.date}</span>
                </span>
                <span className="tabular-nums">{formatSGD(txn.amount)}</span>
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
  const account = ACCOUNTS.find((item) => item.id === txn.accountId)
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
    <Page title={t('notFound.title')}>
      <div className="space-y-3 p-4">
        <h2 className="text-xl font-semibold">{t('notFound.title')}</h2>
        <p>{t('notFound.body')}</p>
        <Link to="/" className="ocbc-btn">{t('notFound.home')}</Link>
      </div>
    </Page>
  )
}
