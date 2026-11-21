import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Bell, Check, ChevronRight, Coins, Eye, EyeOff, Lock, ScanLine, Settings } from 'lucide-react'
import { percentChange, rowsFor, sum } from '@/data/insights'
import { useApp } from '@/context/AppContext'
import { BottomNav, DemoBadge, GuideDone, HeaderHelp } from '@/components/Shell'
import { SpeakButton } from '@/components/SpeakButton'
import { speak, stopSpeaking } from '@/lib/speech'
import { readableText } from '@/lib/tourPlace'
import { translate } from '@/i18n'
import { SHORTCUT_ICONS, SHORTCUT_ROUTES } from '@/lib/shortcutItems'
import { startAppTour } from '@/lib/appTour'
import { formatDay, formatMoney, formatTxnAmount } from '@/lib/format'
import { payeeName } from '@/data/bank'
import { ExcludedTag, TxnSheet, txnKind } from '@/components/TxnSheet'
import { Avatar } from '@/components/ui/Avatar'
import { IconCircle } from '@/components/ui/IconCircle'
import { Pill } from '@/components/ui/Pill'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { AdaptiveNudge } from '@/components/AdaptiveNudge'

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
  const lang = app.prefs.language
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)
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

  const money = (value: number) => (hidden ? t('look.hiddenBalance') : formatMoney(value, lang))
  const simpleHome = app.prefs.detail === 'short'
  const shortcutIds = app.prefs.shortcuts.filter((id) => {
    if (id === 'rewards' || !SHORTCUT_ICONS[id]) return false
    return true
  })
  const homeShortcuts = simpleHome ? shortcutIds.slice(0, 3) : shortcutIds.slice(0, 6)
  const recentLimit = simpleHome ? 3 : 5

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <main id="main" className="nav-clearance min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg)]">
        <GuideDone />
        <AdaptiveNudge />
        <header className="flex min-h-14 items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--card)] py-1 pl-4 pr-3">
          <span className="flex min-w-0 items-center gap-2">
            <Link to="/rewards" className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-full border-[1.5px] border-[var(--accent)] px-3 text-[0.9rem]" aria-label={`${t('rewards.title')}: 1,280 OCBC$`}>
              <Coins aria-hidden size={18} strokeWidth={1.5} className="shrink-0 text-[var(--accent-text)]" />
              <span className="truncate">1,280 OCBC$</span>
            </Link>
            <SpeakButton playing={speaking} listenLabel={t('speech.readAloud')} stopLabel={t('stop')} onClick={readHome} />
          </span>
          <span className="flex shrink-0 items-center gap-1">
            <Link to="/notifications" className="relative flex min-h-11 min-w-11 items-center justify-center" aria-label={t('notifications.title')}>
              <Bell aria-hidden size={22} strokeWidth={1.5} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--accent)]" />
            </Link>
            <HeaderHelp guide />
            <button type="button" className="min-h-11 px-1 text-[1rem] text-[var(--link)] underline" onClick={app.logout}>
              {t('look.logout')}
            </button>
          </span>
        </header>

        <section data-guide="home-greeting" className="relative min-h-[12rem] overflow-hidden bg-[var(--bg)]">
          {/* Neutral placeholder where the real app shows a promo photo. */}
          <span aria-hidden className="absolute right-5 top-7 h-24 w-24 rounded-full bg-[var(--beige)]" />
          <span aria-hidden className="absolute right-20 top-24 h-14 w-14 rounded-full bg-[var(--pink-soft)]" />
          <svg className="absolute inset-y-0 left-0 h-full w-[64%]" viewBox="0 0 240 200" preserveAspectRatio="none" aria-hidden>
            <path d="M0 0H160C222 45 226 140 180 200H0Z" style={{ fill: 'var(--accent)' }} />
          </svg>
          <span className="absolute right-4 top-3"><DemoBadge /></span>
          <div className="relative px-4 pb-14 pt-5 text-[var(--on-accent)]">
            <div className="max-w-[54%]">
              <p className="text-[1.25rem] font-bold leading-snug">{t('look.hi', { name: app.profile.shortName })}</p>
              <p className="mt-1 text-[1rem] leading-snug">{tips[tip]}</p>
            </div>
          </div>
        </section>

        <section className={`relative z-10 px-4 ${app.prefs.textSize >= 20 ? 'mt-3' : '-mt-10'}`} data-guide="home-shortcuts">
          <div className="flex rounded-xl border border-[var(--line)] bg-[var(--card)] px-1 py-3 shadow-[0_8px_24px_rgba(47,53,61,0.12)]">
            <div className={`grid min-w-0 flex-1 gap-y-3 ${simpleHome ? 'grid-cols-3' : 'grid-cols-3'}`}>
              {homeShortcuts.map((id) => (
                <Link key={id} to={SHORTCUT_ROUTES[id] ?? '/pay'} data-guide={id === 'paynow' ? 'home-paynow' : undefined} className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[var(--text)]">
                  <span aria-hidden className="flex h-[2.75rem] items-center justify-center"><ShortcutMark id={id} /></span>
                  <span className="w-full text-center text-[0.85rem] font-normal leading-tight">{t(`shortcuts.${id}`)}</span>
                </Link>
              ))}
            </div>
            <span aria-hidden className="my-1 w-px shrink-0 self-stretch bg-[var(--line)]" />
            <Link to="/settings/shortcuts" data-guide="home-customise" className="flex w-[26%] min-w-0 shrink-0 flex-col items-center justify-center gap-1 px-0.5 text-[var(--text)]">
              <IconCircle size="2.75rem"><Settings aria-hidden size={22} strokeWidth={1.5} /></IconCircle>
              <span className="w-full text-center text-[0.85rem] font-normal leading-tight">{t('look.customise')}</span>
            </Link>
          </div>
        </section>

        <div className="mt-5 flex items-center gap-3 pl-4">
          <button type="button" className="grid h-11 min-h-11 w-11 min-w-11 shrink-0 place-items-center rounded-full bg-[var(--soft)] p-0" aria-pressed={hidden} aria-label={hidden ? t('show') : t('hide')} onClick={() => setHidden((value) => !value)}>
            {hidden ? <EyeOff aria-hidden size={20} strokeWidth={1.5} /> : <Eye aria-hidden size={20} strokeWidth={1.5} />}
          </button>
          {!simpleHome && (
            <>
              <span aria-hidden className="h-8 w-px shrink-0 bg-[var(--muted)]" />
              <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pr-4">
                {PILLS.map((id) => (
                  <Pill
                    key={id}
                    data-guide={id === 'accounts' ? 'nav-accounts' : undefined}
                    active={pill === id}
                    onClick={() => setPill(id)}
                  >
                    {t(`look.${id}`)}
                  </Pill>
                ))}
              </div>
            </>
          )}
        </div>

        <section className="px-4 pt-3" data-guide={pill === 'accounts' ? 'accounts-list' : undefined}>
          {pill === 'accounts' && deposits.map((account, index) => {
            const balance = app.balances[account.id] ?? account.balance
            const code = account.id === 'frank' ? 'FRA' : account.id === '360' ? '360' : account.id.slice(0, 3).toUpperCase()
            return (
              <article key={account.id} className="mb-3 rounded-xl bg-[var(--beige)] p-4 text-[var(--text)]">
                <Link to={`/accounts/${account.id}`} data-guide={index === 0 ? 'home-balance' : undefined} className="flex items-start gap-3">
                  <span data-skip-speech className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#F6D5BF] text-[0.8rem] font-bold text-[#3a2418]">{code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1.1rem] font-bold leading-snug">{t(account.nameKey)}</span>
                    <span className="block text-[1rem] font-normal">{account.number}</span>
                    <span className="block text-[1rem] font-normal uppercase">{app.profile.name}</span>
                  </span>
                  <ChevronRight aria-hidden size={22} strokeWidth={1.5} className="mt-1 shrink-0" />
                </Link>
                <span className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 text-[1rem]">
                  <span>{t('look.available')}</span>
                  <strong className="whitespace-nowrap text-[1.15rem]">{money(balance)}</strong>
                </span>
                {index === 0 && app.cards[0] && (
                  <span className="mt-3 block border-t border-[color:color-mix(in_srgb,var(--muted)_35%,transparent)] pt-3">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 text-[1rem]">
                      <span>{t('look.debitCard')}</span>
                      <span className="whitespace-nowrap">{hidden ? '•••• ••••' : `•••• ${app.cards[0].last4}`}</span>
                    </span>
                    <span className="mt-1 inline-flex items-center gap-1 text-[0.85rem] text-[var(--muted)]">
                      {app.cards[0].locked ? <Lock aria-hidden size={14} /> : <Check aria-hidden size={14} className="text-[var(--ok)]" />}
                      {app.cards[0].locked ? t('look.cardLocked') : t('look.cardActive')}
                    </span>
                    <span className="flex flex-wrap gap-x-4" aria-label={`${t('look.debitCard')} ${app.cards[0].last4}, ${app.cards[0].locked ? t('look.cardLocked') : t('look.cardActive')}`}>
                      <Link className="inline-flex min-h-11 items-center text-[1rem] text-[var(--link)] underline" to={`/flow/card-lock?card=${app.cards[0].id}`}>{app.cards[0].locked ? t('look.unlockCard') : t('look.lockCard')}</Link>
                      <Link className="inline-flex min-h-11 items-center text-[1rem] text-[var(--link)] underline" to={`/cards#${app.cards[0].id}`}>{t('look.cardDetails')}</Link>
                    </span>
                  </span>
                )}
              </article>
            )
          })}
          {pill !== 'accounts' && (
            <article className="rounded-xl bg-[var(--beige)] p-4">
              <p className="font-bold">{t(`look.${pill}Empty`)}</p>
              {(pill === 'investments' || pill === 'insurance') && (
                <Link to={`/${pill}`} className="mt-3 inline-flex min-h-11 items-center rounded-full border border-[var(--slate)] px-4 text-[0.85rem] font-semibold text-[var(--slate)] underline">{t('look.start')}</Link>
              )}
            </article>
          )}
        </section>

        {!simpleHome && (
          <section data-guide="home-foryou" className="flex w-full min-w-0 max-w-full gap-3 overflow-x-auto px-4 py-4">
            {([
              { to: '/flow/goal', kicker: 'look.goalKicker', line: 'look.goalLine', link: 'look.goalLink' },
              { to: '/insights', kicker: 'look.insightKicker', line: 'look.insightLine', link: 'look.insightLink' },
              { to: '/flow/overseas?practice=1&tour=1', kicker: 'look.practiceKicker', line: 'forYouBody', link: 'look.practiceLink' },
            ]).map((card) => (
              <Link key={card.to} to={card.to} className="flex w-[78%] max-w-[18rem] shrink-0 flex-col rounded-xl bg-[var(--pink-soft)] p-4 text-[var(--text)]">
                <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-[var(--muted)]">{t(card.kicker)}</span>
                <span className="mt-1 text-[1rem] font-semibold leading-snug">{t(card.line)}</span>
                <span className="mt-auto pt-2 text-[0.95rem] text-[var(--link)] underline">{t(card.link)}</span>
              </Link>
            ))}
          </section>
        )}

        {app.txns.length > 0 && (
          <section className="bg-[var(--beige)] pb-5 pt-6">
            <div className="px-4">
              <SectionTitle>{t('recent')}</SectionTitle>
              <p className="text-[1rem] text-[var(--muted)]">{t('look.recentHint')}</p>
            </div>
            <div className="mx-4 mt-4 rounded-xl bg-[var(--card)] px-4 py-1">
              {app.txns.slice(0, recentLimit).reduce<{ day: string; txns: typeof app.txns }[]>((groups, txn) => {
                const day = txn.date.slice(0, 10)
                const last = groups[groups.length - 1]
                if (last && last.day === day) last.txns.push(txn)
                else groups.push({ day, txns: [txn] })
                return groups
              }, []).map((group) => (
                <div key={group.day}>
                  <h3 className="pb-1 pt-3 text-[0.95rem] font-normal">{formatDay(group.day, app.prefs.language)}</h3>
                  <ul>
                    {group.txns.map((txn) => (
                      <li key={txn.id} className="border-b border-[var(--line)] last:border-0">
                        <button type="button" className="flex w-full items-start gap-3 py-3 text-left" onClick={() => setSheetId(txn.id)}>
                          <Avatar text={txn.accountId === 'frank' ? 'FRA' : 'SAV'} size="2.75rem" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[0.95rem] font-semibold uppercase">{t(txnKind(txn.title))}</span>
                            <span className="block text-[0.95rem] uppercase text-[var(--muted)]">{payeeName(txn.title)}<ExcludedTag txn={txn} t={t} /></span>
                          </span>
                          <span className={`shrink-0 whitespace-nowrap text-[1.05rem] font-bold tabular-nums ${txn.amount > 0 ? 'text-[var(--ok)]' : ''}`}>{formatTxnAmount(txn.amount, lang)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {app.prefs.spendingInsights && (
          <section className="px-4 py-5" data-testid="spending-insights-home">
            <Link to="/insights" className="block rounded-xl bg-[var(--pink-soft)] p-4 text-[var(--text)]">
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[0.7rem] font-bold text-[var(--on-accent)]">{t('look.new')}</span>
              <p className="mt-2 font-bold">{t('insights')}</p>
              <p className="text-[0.85rem]">
                {t('insight.vsLast', {
                  amount: formatMoney(sum(rowsFor('all', '2026-10')), lang),
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
            <p className="text-[0.7rem] font-bold tracking-wide">{t('look.new')}</p>
            <h2 id="tour-offer" className="mt-1 text-[1.6rem] font-bold leading-tight">{t('gate.tourTitle')}</h2>
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
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
        <rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 18h4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (id === 'scan') return <ScanLine aria-hidden size={26} strokeWidth={1.5} />
  if (id === 'customise') return <Settings aria-hidden size={26} strokeWidth={1.5} />
  const Icon = SHORTCUT_ICONS[id]
  return Icon ? <Icon aria-hidden size={26} strokeWidth={1.5} /> : <ScanLine aria-hidden size={26} strokeWidth={1.5} />
}
