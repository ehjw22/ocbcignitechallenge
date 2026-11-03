import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Page } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { NOTIFICATIONS, payeeName } from '@/data/bank'
import { translate } from '@/i18n'
import { CircleDollarSign, FileText, Info, LockKeyhole, SlidersHorizontal } from 'lucide-react'
import { formatDay, formatMoney, formatSignedMoney } from '@/lib/format'
import { txnKind } from '@/components/TxnSheet'

export function AccountDetail() {
  const { accountId = '' } = useParams()
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const account = app.accounts.find((item) => item.id === accountId)
  const txns = useMemo(() => app.txns.filter((txn) => txn.accountId === accountId), [app.txns, accountId])
  const months = useMemo(() => {
    const found = [...new Set(txns.map((txn) => txn.date.slice(0, 7)))]
    return found.slice(0, 4)
  }, [txns])
  const [month, setMonth] = useState(months[0] || '')
  const setScreen = app.setScreen
  useEffect(() => { setScreen('account') }, [setScreen])
  if (!account) return <NotFound />
  const balance = account.kind === 'card' ? account.balance : app.balances[account.id] ?? account.balance
  const shown = txns.filter((txn) => !month || txn.date.startsWith(month))
  return (
    <Page title="" back>
      <div className="bg-[var(--bg)] px-4 pb-4 text-[var(--text)]">
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
            <Link to="/info/statements" data-guide="txn-search" className="inline-flex min-h-11 items-center gap-1 text-[13px] font-semibold text-[var(--link)] underline">{t('look.viewStatement')}<FileText size={16} /></Link>
          </span>
        </div>
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {months.map((item) => (
            <button key={item} type="button" className={`min-h-11 shrink-0 rounded-full px-3 text-[13px] font-semibold ${item === month ? 'bg-[#E30613] text-white' : 'border border-[var(--line)]'}`} onClick={() => setMonth(item)}>
              {new Intl.DateTimeFormat(app.prefs.language.startsWith('zh') ? 'zh-CN' : 'en-SG', { month: 'short', year: 'numeric' }).format(new Date(`${item}-01T00:00:00`))}
            </button>
          ))}
        </div>
        <p className="mb-3 flex gap-2 rounded-lg bg-[#E3E1F0] p-3 text-[13px] text-[#1F2933]"><Info size={16} className="shrink-0 text-[#3B5BDB]" />{t('look.pending')}</p>
        <ul className="divide-y divide-[var(--line)] rounded-xl bg-[var(--card)]">
          {shown.map((txn) => (
            <li key={txn.id}>
              <Link to={`/txn/${txn.id}`} className="flex items-start justify-between gap-3 px-3 py-3">
                <span>
                  <span className="block text-[12px] text-[var(--muted)]">{formatDay(txn.date, app.prefs.language)}</span>
                  <span className="block text-[13px] font-bold uppercase">{t(txnKind(txn.title))}</span>
                  <span className="block text-[13px] text-[var(--muted)]">{payeeName(txn.title)}</span>
                </span>
                <span className={`text-[15px] font-bold tabular-nums ${txn.amount > 0 ? 'text-[#1E8E3E]' : ''}`}>{txn.amount < 0 ? txn.amount.toFixed(2) : txn.amount.toFixed(2)}</span>
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
  const setScreen = app.setScreen
  useEffect(() => { setScreen('transaction') }, [setScreen])
  if (!txn) return <NotFound />
  const account = app.accounts.find((item) => item.id === txn.accountId)
  return (
    <Page title={t('txn.title')} back>
      <article className="card m-4 space-y-3 p-4">
        <h2 className="text-xl font-semibold leading-normal">{t('look.fastPayment')}</h2>
        <p>{account ? t(account.nameKey) : ''} · {account?.number.slice(-4)}</p>
        <p>{formatDay(txn.date, app.prefs.language)} {txn.date.slice(0, 4)}</p>
        <p className="text-2xl font-bold tabular-nums">{formatSignedMoney(txn.amount)}</p>
        <p className="border-l-4 border-[#E30613] pl-3">{payeeName(txn.title)}</p>
        <Link to="/help?staff=1" className="block min-h-11 font-semibold text-[var(--link)] underline">{t('look.report')}</Link>
        <p><span className="text-[var(--muted)]">{t('flows.from')}</span> {account ? t(account.nameKey) : txn.accountId}</p>
        <p><span className="text-[var(--muted)]">{t('success.reference')}</span> {txn.id}</p>
      </article>
    </Page>
  )
}

export function Notifications() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const [tab, setTab] = useState<'bank' | 'deals'>('bank')
  const setScreen = app.setScreen
  useEffect(() => { setScreen('notifications') }, [setScreen])
  return (
    <Page title={t('notifications.title')} back>
      <div className="flex gap-4 px-4 pt-3 text-[15px]">
        <button type="button" className={`min-h-11 border-b-2 ${tab === 'bank' ? 'border-[#E30613] font-semibold' : 'border-transparent'}`} onClick={() => setTab('bank')}>{t('look.banking')}</button>
        <button type="button" className={`min-h-11 border-b-2 ${tab === 'deals' ? 'border-[#E30613] font-semibold' : 'border-transparent'}`} onClick={() => setTab('deals')}>{t('look.deals')}</button>
      </div>
      <ul className="divide-y divide-[var(--line)] bg-[var(--card)]">
        {tab === 'deals' && <li className="px-4 py-6 text-[var(--muted)]">{t('look.dealsEmpty')}</li>}
        {tab === 'bank' && NOTIFICATIONS.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <p className="font-semibold leading-normal">{t(item.title)}</p>
            <p className="leading-normal">{app.accounts.some((account) => account.id === 'frank') ? t(item.body).replace('360 Account', 'FRANK Account').replace('360账户', 'FRANK 账户').replace('360 账户', 'FRANK 账户') : t(item.body)}</p>
            <p className="text-sm text-[var(--muted)]">{formatDay(item.date, app.prefs.language)}</p>
          </li>
        ))}
      </ul>
    </Page>
  )
}

export function Profile() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const setScreen = app.setScreen
  useEffect(() => { setScreen('profile') }, [setScreen])
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
