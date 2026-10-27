import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { payeeName } from '@/data/bank'
import { translate } from '@/i18n'
import { formatSGD } from '@/lib/format'

export function Accounts() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const [query, setQuery] = useState('')
  const [accountId, setAccountId] = useState('all')
  useEffect(() => { app.setScreen('accounts') }, [])
  const txns = useMemo(() => app.txns.filter((txn) => {
    const accountOk = accountId === 'all' || txn.accountId === accountId
    const name = payeeName(txn.title).toLowerCase()
    const q = query.trim().toLowerCase()
    return accountOk && (!q || name.includes(q) || txn.date.includes(q))
  }), [app.txns, accountId, query])
  return (
    <Page title={t('accounts.title')}>
      <div className="space-y-3 px-4 py-4">
        {app.accounts.map((account, index) => (
          <Link key={account.id} to={`/accounts/${account.id}`} data-guide={index === 0 ? 'accounts-list' : undefined} className="card block px-4 py-4">
            <h2 className="text-[0.9rem] font-medium leading-normal">{t(account.nameKey)}</h2>
            <p className="text-[0.75rem] text-[var(--muted)]">{account.kind === 'card' ? `•••• ${account.number}` : account.number}</p>
            <p className="mt-2 text-[1.6rem] font-bold tabular-nums leading-normal tracking-tight">
              {account.kind === 'card' ? formatSGD(account.balance) : formatSGD(app.balances[account.id] ?? account.balance)}
            </p>
            <p className="text-[0.75rem] text-[var(--muted)]">{account.kind === 'card' ? t('outstanding') : t('available')}</p>
          </Link>
        ))}
        <h2 className="pt-2 text-lg font-semibold">{t('recent')}</h2>
        <label className="block text-[0.85rem] font-medium" htmlFor="txn-search">
          {t('txn.search')}
          <input id="txn-search" data-guide="txn-search" value={query} onChange={(e) => setQuery(e.target.value)} className="ocbc-field mt-1" />
        </label>
        <label className="block text-[0.85rem] font-medium" htmlFor="txn-account">
          {t('txn.filterAccount')}
          <select id="txn-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className="ocbc-field mt-1">
            <option value="all">{t('txn.allAccounts')}</option>
            {app.accounts.map((account) => <option key={account.id} value={account.id}>{t(account.nameKey)}</option>)}
          </select>
        </label>
        <ul className="card divide-y divide-[var(--line)]">
          {txns.map((txn) => (
            <li key={txn.id}>
              <Link to={`/txn/${txn.id}`} className="flex items-center justify-between gap-3 px-3 py-3">
                <span className="min-w-0">
                  <span className="block leading-normal">{payeeName(txn.title)}</span>
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
