import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Bell, ChevronRight, Eye, EyeOff, Settings } from 'lucide-react'
import { percentChange, rowsFor, sum } from '@/data/insights'
import { useApp } from '@/context/AppContext'
import { BottomNav, DemoBadge, GuideDone, HeaderHelp } from '@/components/Shell'
import { translate } from '@/i18n'
import { SHORTCUT_ICONS, SHORTCUT_ROUTES } from '@/lib/shortcutItems'
import { startAppTour } from '@/lib/appTour'
import { formatMoney, formatTxnAmount } from '@/lib/format'
import { payeeName } from '@/data/bank'

const PILLS = ['accounts', 'cards', 'investments', 'insurance', 'loans', 'net'] as const

export function Home() {
  const app = useApp()
  const [params] = useSearchParams()
  const [hidden, setHidden] = useState(false)
  const [pill, setPill] = useState<(typeof PILLS)[number]>('accounts')
  const [offer, setOffer] = useState(() => {
    if (sessionStorage.getItem('ocbc-tour-offer') === '1' || params.get('offer') === '1') {
      sessionStorage.removeItem('ocbc-tour-offer')
      return true
    }
    return false
  })
  const navigate = useNavigate()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const deposits = app.accounts.filter((account) => account.kind === 'deposit')
  const tips = [t('look.heroTip'), t('look.heroPractice'), t('look.heroScam')]
  const [tip, setTip] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setTip((value) => (value + 1) % tips.length), 6000)
    return () => window.clearInterval(timer)
  }, [tips.length])

  useEffect(() => {
    app.setScreen('home')
    if (params.get('tour') !== '1') return
    const timer = window.setTimeout(() => startAppTour(false), 400)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const shortcuts = app.prefs.shortcuts.filter((id) => id !== 'rewards').slice(0, 3)
  const money = (value: number) => (hidden ? '•••••••• SGD' : formatMoney(value))

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <main id="main" className="mb-[76px] min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg)]">
        <GuideDone />
        <header className="flex h-14 items-center justify-between bg-[var(--card)] px-4">
          <DemoBadge />
          <span className="flex items-center">
            <Link to="/notifications" className="relative flex min-h-11 min-w-11 items-center justify-center" aria-label={t('notifications.title')}>
              <Bell aria-hidden size={22} strokeWidth={1.5} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#E30613]" />
            </Link>
            <HeaderHelp guide />
            <button type="button" className="min-h-11 px-1 text-[15px] font-semibold text-[var(--link)] underline" onClick={app.logout}>
              {t('look.logout')}
            </button>
          </span>
        </header>

        <section data-guide="home-greeting" className="relative h-[168px] overflow-hidden bg-[var(--bg)]">
          <svg className="absolute inset-y-0 left-0 h-full w-[62%]" viewBox="0 0 240 168" preserveAspectRatio="none" aria-hidden>
            <path d="M0 0H150C210 20 230 70 190 110C150 150 190 168 240 168H0Z" fill="#E30613" />
          </svg>
          <div className="relative flex h-full items-center px-4 text-white">
            <div className="max-w-[46%]">
              <p className="text-[16px] font-bold">{t('look.hi', { name: app.profile.shortName })}</p>
              <p className="mt-1 text-[13px] leading-snug">{tips[tip]}</p>
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-8 px-4" data-guide="home-shortcuts">
          <div className="flex items-stretch rounded-xl bg-[var(--card)] px-2 py-3 shadow-[0_8px_24px_rgba(47,53,61,0.08)]">
            {shortcuts.map((id) => {
              const Icon = SHORTCUT_ICONS[id]
              return (
                <Link key={id} to={SHORTCUT_ROUTES[id] ?? '/pay'} className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-center">
                  {Icon && <Icon aria-hidden size={22} strokeWidth={1.5} />}
                  <span className="line-clamp-2 text-[13px] font-semibold leading-tight">{t(`shortcuts.${id}`)}</span>
                </Link>
              )
            })}
            <span className="my-1 w-px bg-[var(--line)]" />
            <Link to="/settings" className="flex min-w-[72px] flex-col items-center justify-center gap-1 px-1">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#E5DEDD] text-[var(--text)]">
                <Settings aria-hidden size={18} strokeWidth={1.5} />
              </span>
              <span className="text-[13px] font-semibold">{t('look.customise')}</span>
            </Link>
          </div>
        </section>

        <div className="mt-4 flex items-center gap-2 px-4">
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--soft)]" aria-pressed={hidden} aria-label={hidden ? t('show') : t('hide')} onClick={() => setHidden((value) => !value)}>
            {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">
            {PILLS.map((id) => (
              <button
                key={id}
                type="button"
                data-guide={id === 'accounts' ? 'nav-accounts' : undefined}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${pill === id ? 'border-[#E30613] bg-[#E30613] text-white' : 'border-[var(--line)] bg-[var(--card)] text-[var(--text)]'}`}
                aria-pressed={pill === id}
                onClick={() => setPill(id)}
              >
                {t(`look.${id}`)}
              </button>
            ))}
          </div>
        </div>

        <section className="px-4 pt-3" data-guide={pill === 'accounts' ? 'accounts-list' : undefined}>
          {pill === 'accounts' && deposits.map((account, index) => {
            const balance = app.balances[account.id] ?? account.balance
            const code = account.id === 'frank' ? 'FRA' : account.id === '360' ? '360' : account.id.slice(0, 3).toUpperCase()
            return (
              <Link key={account.id} to={`/accounts/${account.id}`} data-guide={index === 0 ? 'home-balance' : undefined} className="mb-3 block rounded-xl bg-[var(--soft)] p-4">
                <span className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[#F6D7C8] text-[11px] font-bold text-[var(--text)]">{code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold">{t(account.nameKey)}</span>
                    <span className="block text-[13px] text-[var(--muted)]">{account.number}</span>
                  </span>
                  <ChevronRight size={18} className="text-[var(--muted)]" />
                </span>
                <span className="mt-3 block border-t border-[var(--line)] pt-3 text-[13px] text-[var(--muted)]">
                  {t('look.available')} <strong className="float-right text-[15px] text-[var(--text)]">{money(balance)}</strong>
                </span>
              </Link>
            )
          })}
          {pill !== 'accounts' && (
            <article className="rounded-xl bg-[var(--soft)] p-4">
              <p className="font-bold">{t(`look.${pill}Empty`)}</p>
              {(pill === 'investments' || pill === 'insurance') && (
                <Link to={`/${pill}`} className="mt-3 inline-flex rounded-full border border-[var(--slate)] px-4 py-2 text-[13px] font-semibold text-[var(--slate)] underline">{t('look.start')}</Link>
              )}
            </article>
          )}
        </section>

        <section className="flex min-w-0 max-w-full gap-3 overflow-x-auto px-4 py-4">
          <Link to="/flow/goal" className="w-[240px] shrink-0 rounded-xl bg-[var(--soft)] p-4 text-[var(--text)]">
            <p className="text-[10px] font-bold tracking-wide">{t('look.goalKicker')}</p>
            <p className="mt-1 text-[15px] font-bold">{t('look.goalLine')}</p>
          </Link>
          <Link to="/insights" className="w-[240px] shrink-0 rounded-xl bg-[var(--soft)] p-4 text-[var(--text)]">
            <p className="text-[10px] font-bold tracking-wide">{t('look.insightKicker')}</p>
            <p className="mt-1 text-[15px] font-bold">{t('look.insightLine')}</p>
          </Link>
          <Link to="/flow/overseas?practice=1&tour=1" data-guide="home-foryou" className="w-[240px] shrink-0 rounded-xl bg-[var(--soft)] p-4 text-[var(--text)]">
            <span className="rounded-full bg-[var(--soft)] px-2 py-0.5 text-[11px] font-bold">{t('look.new')}</span>
            <p className="mt-2 text-[15px] font-bold">{t('forYouBody')}</p>
          </Link>
        </section>

        {app.txns.length > 0 && (
          <section className="px-4 pb-4">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <h2 className="text-[18px] font-bold">{t('recent')}</h2>
                <p className="text-[13px] text-[var(--muted)]">{t('look.recentHint')}</p>
              </div>
            </div>
            <ul className="overflow-hidden rounded-xl bg-[var(--card)] shadow-[0_8px_24px_rgba(47,53,61,0.06)]">
              {app.txns.slice(0, 5).map((txn) => (
                <li key={txn.id} className="border-b border-[var(--line)] last:border-0">
                  <Link to={`/txn/${txn.id}`} className="flex items-center gap-3 px-3 py-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2F353D] text-[10px] font-bold text-white">
                      {(txn.accountId === 'frank' ? 'FRA' : 'SAV')}
                    </span>
                    <span className="min-w-0 flex-1 text-[12px] font-semibold uppercase leading-snug">{payeeName(txn.title)}</span>
                    <span className={`text-[15px] font-bold tabular-nums ${txn.amount > 0 ? 'text-[#1E8E3E]' : ''}`}>{formatTxnAmount(txn.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {app.prefs.spendingInsights && (
          <section className="px-4 pb-6">
            <Link to="/insights" className="block rounded-xl bg-[var(--soft)] p-4 text-[var(--text)]">
              <span className="rounded-full bg-[var(--soft)] px-2 py-0.5 text-[11px] font-bold">{t('look.new')}</span>
              <p className="mt-2 font-bold">{t('insights')}</p>
              <p className="text-[13px]">
                {t('insight.vsLast', {
                  amount: formatMoney(sum(rowsFor('all', '2026-10'))),
                  pct: Math.abs(percentChange(sum(rowsFor('all', '2026-10')), sum(rowsFor('all', '2026-09')))),
                  dir: percentChange(sum(rowsFor('all', '2026-10')), sum(rowsFor('all', '2026-09'))) >= 0 ? t('insight.more') : t('insight.less'),
                })}
              </p>
            </Link>
          </section>
        )}
      </main>
      <BottomNav />
      {offer && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/40 px-4 pb-24">
          <div role="dialog" aria-modal="true" aria-labelledby="tour-offer" className="w-full rounded-xl bg-[var(--card)] p-4 text-[var(--text)] shadow-xl">
            <p className="text-[10px] font-bold tracking-wide">{t('look.new')}</p>
            <h2 id="tour-offer" className="mt-1 text-[26px] font-bold leading-tight">{t('gate.tourTitle')}</h2>
            <p className="mt-1 text-[var(--muted)]">{t('look.easy')}</p>
            <button type="button" className="mt-4 min-h-11 rounded-full border border-[var(--slate)] px-4 font-semibold text-[var(--slate)] underline" onClick={() => { setOffer(false); navigate('/', { replace: true }); startAppTour(false) }}>
              {t('look.showMe')}
            </button>
            <button type="button" className="mt-2 block min-h-11 text-[var(--link)] underline" onClick={() => { setOffer(false); navigate('/', { replace: true }) }}>
              {t('gate.tourLater')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
