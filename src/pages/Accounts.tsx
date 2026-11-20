import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Page } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { percentChange, rowsFor, sum } from '@/data/insights'
import { payeeName } from '@/data/bank'
import { translate } from '@/i18n'
import { formatDay, formatMoney, formatSignedMoney } from '@/lib/format'

export function Accounts() {
  const app = useApp()
  const lang = app.prefs.language
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)
  const [query, setQuery] = useState('')
  const [accountId, setAccountId] = useState('all')
  const setScreen = app.setScreen
  useEffect(() => { setScreen('accounts') }, [setScreen])
  const txns = useMemo(() => app.txns.filter((txn) => {
    const accountOk = accountId === 'all' || txn.accountId === accountId
    const name = payeeName(txn.title).toLowerCase()
    const q = query.trim().toLowerCase()
    return accountOk && (!q || name.includes(q) || txn.date.includes(q))
  }), [app.txns, accountId, query])
  return (
    <Page title={t('accounts.title')}>
      <div className="space-y-3 px-4 py-4">
        {app.prefs.spendingInsights && (
          <Link
            to="/insights"
            data-testid="spending-insights-accounts"
            className="card block px-4 py-4 text-[var(--text)]"
          >
            <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-[var(--muted)]">{t('insights')}</p>
            <p className="mt-1 text-[0.95rem] leading-snug">
              {t('insight.vsLast', {
                amount: formatMoney(sum(rowsFor('all', '2026-10')), lang),
                pct: Math.abs(percentChange(sum(rowsFor('all', '2026-10')), sum(rowsFor('all', '2026-09')))),
                dir: percentChange(sum(rowsFor('all', '2026-10')), sum(rowsFor('all', '2026-09'))) >= 0 ? t('insight.more') : t('insight.less'),
              })}
            </p>
            <span className="mt-2 inline-block text-[0.9rem] text-[var(--link)] underline">{t('look.insightLink')}</span>
          </Link>
        )}
        {app.accounts.map((account, index) => (
          <Link key={account.id} to={`/accounts/${account.id}`} data-guide={index === 0 ? 'accounts-list' : undefined} className="card block px-4 py-4">
            <h2 className="text-[0.9rem] font-medium leading-normal">{t(account.nameKey)}</h2>
            <p className="text-[0.75rem] text-[var(--muted)]">{account.kind === 'card' ? `•••• ${account.number}` : account.number}</p>
            <p className="mt-2 text-[1.6rem] font-bold tabular-nums leading-normal tracking-tight">
              {account.kind === 'card' ? formatMoney(account.balance, lang) : formatMoney(app.balances[account.id] ?? account.balance, lang)}
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
              <Link to={`/txn/${txn.id}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-3">
                <span className="min-w-0">
                  <span className="block leading-normal">{payeeName(txn.title)}</span>
                  <span className="text-sm text-[var(--muted)]">{formatDay(txn.date, app.prefs.language)}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap tabular-nums">{formatSignedMoney(txn.amount, lang)}</span>
              </Link>
            </li>
          ))}
          {txns.length === 0 && <li className="px-3 py-3 text-[var(--muted)]">{t('txn.none')}</li>}
        </ul>
      </div>
    </Page>
  )
}
