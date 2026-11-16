import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bell, Check, ChevronRight, Eye, EyeOff, Lock, ScanLine, Settings } from 'lucide-react'
import { percentChange, rowsFor, sum } from '@/data/insights'
import { useApp } from '@/context/AppContext'
import { BottomNav, DemoBadge, GuideDone, HeaderHelp } from '@/components/Shell'
import { SpeakButton } from '@/components/SpeakButton'
import { speak, stopSpeaking } from '@/lib/speech'
import { readableText } from '@/lib/tourPlace'
import { translate } from '@/i18n'
import { SHORTCUT_ICONS, SHORTCUT_ROUTES } from '@/lib/shortcutItems'
import { startAppTour } from '@/lib/appTour'
import { formatMoney, formatTxnAmount } from '@/lib/format'
import { payeeName } from '@/data/bank'
import { TxnSheet, txnKind } from '@/components/TxnSheet'

const PILLS = ['accounts', 'cards', 'investments', 'insurance', 'loans', 'net'] as const

export function Home() {
  const app = useApp()
  const { txnId = '' } = useParams()
  const [sheetId, setSheetId] = useState(txnId)
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
  const [speaking, setSpeaking] = useState(false)
  const readHome = () => {
    if (speaking) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    void speak(readableText(document.getElementById('main'), t('nav.home')), { language: app.prefs.language, rate: app.prefs.speechRate, dialect: app.prefs.dialect }).finally(() => setSpeaking(false))
  }
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

  const money = (value: number) => (hidden ? '•••••••• SGD' : formatMoney(value))

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <main id="main" className="nav-clearance min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg)]">
        <GuideDone />
        <header className="flex h-14 items-center justify-between bg-[var(--card)] px-4">
          <span className="flex items-center">
            <SpeakButton playing={speaking} listenLabel={t('speech.readAloud')} stopLabel={t('stop')} onClick={readHome} />
            <DemoBadge />
          </span>
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

        <section data-guide="home-greeting" className="relative min-h-[168px] overflow-hidden bg-[var(--bg)]">
          <svg className="absolute inset-y-0 left-0 h-full w-[62%]" viewBox="0 0 240 168" preserveAspectRatio="none" aria-hidden>
            <path d="M0 0H150C210 20 230 70 190 110C150 150 190 168 240 168H0Z" fill="#E30613" />
          </svg>
          <div className="relative flex min-h-[168px] items-center px-4 py-4 text-white">
            <div className="max-w-[46%]">
              <p className="text-[1rem] font-bold">{t('look.hi', { name: app.profile.shortName })}</p>
              <p className="mt-1 text-[0.85rem] leading-snug">{tips[tip]}</p>
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-8 px-4" data-guide="home-shortcuts">
          <div className="grid grid-cols-4 rounded-xl bg-[var(--card)] px-1 py-3 shadow-[0_8px_24px_rgba(47,53,61,0.08)]">
            {[...app.prefs.shortcuts.filter((id) => {
              if (id === 'rewards' || !SHORTCUT_ICONS[id]) {
                if (id !== 'rewards' && !SHORTCUT_ICONS[id] && import.meta.env.DEV) console.warn('shortcut skipped', id)
                return false
              }
              return true
            }).slice(0, 6), 'customise'].map((id) => (
              <Link key={id} to={id === 'customise' ? '/settings/shortcuts' : (SHORTCUT_ROUTES[id] ?? '/pay')} data-guide={id === 'paynow' ? 'home-paynow' : id === 'customise' ? 'home-customise' : undefined} className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[var(--text)]">
                <ShortcutMark id={id} />
                <span className="line-clamp-2 w-full break-normal text-center text-[11px] font-normal leading-[13px]">{id === 'customise' ? t('look.customise') : t(`shortcuts.${id}`)}</span>
              </Link>
            ))}
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
              <article key={account.id} className="mb-3 rounded-xl p-4" style={{ background: app.prefs.scheme === 'dark' ? 'var(--card)' : '#F4EEE9', color: app.prefs.scheme === 'dark' ? 'var(--text)' : '#333' }}>
                <Link to={`/accounts/${account.id}`} data-guide={index === 0 ? 'home-balance' : undefined} className="flex items-center gap-3">
                  <span data-skip-speech className="grid h-11 w-11 place-items-center rounded-full bg-[#F6D5BF] text-[12px] font-bold text-[#3a2418]">{code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-bold">{t(account.nameKey)}</span>
                    <span className="block text-[14px] font-normal">{account.number}</span>
                    <span className="block text-[14px] font-normal">{app.profile.name}</span>
                  </span>
                  <ChevronRight size={18} />
                </Link>
                <span className="mt-3 flex flex-wrap items-baseline justify-between gap-x-3 border-t border-[#E7E0DA] pt-3 text-[0.9rem]">
                  <span>{t('look.available')}</span>
                  <strong className="whitespace-nowrap text-[1rem]">{money(balance)}</strong>
                </span>
                {index === 0 && app.cards[0] && (
                  <span className="mt-3 block border-t border-[#E7E0DA] pt-3">
                    <span className="flex items-center gap-3">
                      <span className="card-art h-[26px] w-10 shrink-0 rounded bg-gradient-to-br from-[#E30613] to-[#9b1020]" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold">{t('look.debitCard')}</span>
                        <span className="block text-[14px]">{hidden ? '•••• ••••' : `•••• ${app.cards[0].last4}`}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[13px]">
                        {app.cards[0].locked ? <Lock size={14} /> : <Check size={14} className="text-[#1E8E3E]" />}
                        {app.cards[0].locked ? t('look.cardLocked') : t('look.cardActive')}
                      </span>
                    </span>
                    <span className="mt-2 flex flex-wrap gap-x-4 gap-y-1" aria-label={`${t('look.debitCard')} ${app.cards[0].last4}, ${app.cards[0].locked ? t('look.cardLocked') : t('look.cardActive')}`}>
                      <Link className="inline-flex min-h-11 items-center text-[15px] text-[#1C65FF] underline" to={`/flow/card-lock?card=${app.cards[0].id}`}>{app.cards[0].locked ? t('look.unlockCard') : t('look.lockCard')}</Link>
                      <Link className="inline-flex min-h-11 items-center text-[15px] text-[#1C65FF] underline" to={`/cards#${app.cards[0].id}`}>{t('look.cardDetails')}</Link>
                    </span>
                  </span>
                )}
              </article>
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

        <section data-guide="home-foryou" className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto px-4 py-4">
          <Link to="/flow/goal" className="w-[240px] shrink-0 rounded-xl bg-[var(--soft)] p-4 text-[var(--text)]">
            <p className="text-[10px] font-bold tracking-wide">{t('look.goalKicker')}</p>
            <p className="mt-1 text-[15px] font-bold">{t('look.goalLine')}</p>
          </Link>
          <Link to="/insights" className="w-[240px] shrink-0 rounded-xl bg-[var(--soft)] p-4 text-[var(--text)]">
            <p className="text-[10px] font-bold tracking-wide">{t('look.insightKicker')}</p>
            <p className="mt-1 text-[15px] font-bold">{t('look.insightLine')}</p>
          </Link>
          <Link to="/flow/overseas?practice=1&tour=1" className="w-[240px] shrink-0 rounded-xl bg-[var(--soft)] p-4 text-[var(--text)]">
            <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold text-white">{t('look.new')}</span>
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
                  <button type="button" className="flex w-full items-center gap-3 px-3 py-3 text-left" onClick={() => setSheetId(txn.id)}>
                    <span data-skip-speech className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#2F353D] text-[10px] font-bold text-white">
                      {(txn.accountId === 'frank' ? 'FRA' : 'SAV')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-bold uppercase">{t(txnKind(txn.title))}</span>
                      <span className="block text-[12px] text-[var(--muted)]">{payeeName(txn.title)}</span>
                    </span>
                    <span className={`shrink-0 whitespace-nowrap text-[0.95rem] font-bold tabular-nums ${txn.amount > 0 ? 'text-[#1E8E3E]' : ''}`}>{formatTxnAmount(txn.amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {app.prefs.spendingInsights && (
          <section className="px-4 pb-6">
            <Link to="/insights" className="block rounded-xl bg-[var(--soft)] p-4 text-[var(--text)]">
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold text-white">{t('look.new')}</span>
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
      {sheetId && app.txns.some((txn) => txn.id === sheetId) && (
        <TxnSheet
          txn={app.txns.find((txn) => txn.id === sheetId)!}
          account={app.accounts.find((account) => account.id === app.txns.find((txn) => txn.id === sheetId)?.accountId)}
          language={app.prefs.language}
          t={t}
          onClose={() => setSheetId('')}
        />
      )}
      {offer && (
        <div className="absolute inset-0 z-40 flex items-end bg-black/40 px-4" style={{ paddingBottom: 'calc(64px + var(--nav-safe, 0px))' }}>
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

function ShortcutMark({ id }: { id: string }) {
  if (id === 'paynow') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <path d="M10 18h4" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    )
  }
  if (id === 'scan') return <ScanLine aria-hidden size={24} strokeWidth={1.75} />
  if (id === 'customise') return <Settings aria-hidden size={24} strokeWidth={1.75} />
  const Icon = SHORTCUT_ICONS[id]
  return Icon ? <Icon aria-hidden size={24} strokeWidth={1.75} /> : <ScanLine aria-hidden size={24} strokeWidth={1.75} />
}
