import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronRight, Globe, Lock, Receipt, ScanLine, Smartphone, ArrowLeftRight, Headset, MessageSquare } from 'lucide-react'
import { BottomNav, Page } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { JOURNEY_IDS } from '@/data/flows'
import { translate } from '@/i18n'
import { requestText } from '@/lib/staffSummary'
import { startAppTour, tourState } from '@/lib/appTour'

const PAY_LINKS = [
  ['paynow', '/flow/paynow'],
  ['transfer', '/flow/transfer'],
  ['overseas', '/flow/overseas'],
  ['bill', '/flow/bill'],
  ['giro', '/flow/giro'],
  ['scan', '/flow/scan'],
  ['goal', '/flow/goal'],
  ['card-lock', '/flow/card-lock'],
  ['card-lost', '/flow/card-lost'],
  ['limit', '/flow/limit'],
] as const

function label(id: string, t: (key: string) => string) {
  if (id === 'card-lock') return t('flows.cardLock')
  if (id === 'card-lost') return t('flows.cardLost')
  if (id === 'limit') return t('flows.limit')
  if (id === 'bill') return t('flows.bill')
  if (id === 'goal') return t('flows.goal')
  return t(`flows.${id}`)
}

export function PayHub() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const setScreen = app.setScreen
  useEffect(() => { setScreen('pay') }, [setScreen])
  const grid = [
    ['scan', '/flow/scan', ScanLine, 'pay-scan'],
    ['paynow', '/flow/paynow', Smartphone, 'pay-paynow'],
    ['transfer', '/flow/transfer', ArrowLeftRight, 'pay-transfer'],
    ['overseas', '/flow/overseas', Globe, 'pay-overseas'],
    ['bill', '/flow/bill', Receipt, 'pay-bill'],
  ] as const
  return (
    <Page title="">
      <div className="px-4 pb-2 pt-2">
        <h1 className="max-w-[70%] text-[24px] font-bold leading-tight text-[var(--text)]">{t('look.paymentsTitle')}</h1>
      </div>
      <div className="px-4">
        <div className="grid grid-cols-3 gap-y-4 rounded-xl bg-[var(--card)] p-4 shadow-[0_8px_24px_rgba(47,53,61,0.06)]">
          {grid.map(([id, to, Icon, guide]) => (
            <Link key={id} to={to} data-guide={guide} className="flex min-h-11 flex-col items-center gap-1 text-center">
              <Icon aria-hidden size={22} strokeWidth={1.5} />
              <span className="text-[15px] font-normal">{label(id, t)}</span>
            </Link>
          ))}
        </div>
        <Link to="/flow/transfer?practice=1&tour=1" className="mt-3 flex items-center justify-between rounded-xl bg-[var(--soft)] px-4 py-3 text-[var(--text)]">
          <span>
            <span className="mr-2 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold text-white">{t('look.new')}</span>
            <span className="text-[15px] font-bold">{t('look.practiseStrip')}</span>
          </span>
          <ChevronRight size={18} />
        </Link>
        <h2 className="mb-1 mt-5 text-[18px] font-bold">{t('look.manage')}</h2>
        <ul className="divide-y divide-[var(--line)]">
          {PAY_LINKS.filter(([id]) => !['paynow', 'transfer', 'overseas', 'bill', 'scan'].includes(id)).map(([id, to]) => (
            <li key={id}>
              <Link to={to} data-guide={`pay-${id}`} className="flex min-h-12 items-center justify-between py-3 text-[15px] font-semibold">
                {label(id, t)}
                <ChevronRight size={18} className="text-[var(--muted)]" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  )
}

export function HelpPage() {
  const app = useApp()
  const navigate = useNavigate()
  const t = (key: string) => translate(app.prefs.language, key)
  const setScreen = app.setScreen
  const openHelp = app.openHelp
  useEffect(() => {
    setScreen('help')
    if (new URLSearchParams(window.location.search).get('staff') === '1') openHelp('staff')
  }, [setScreen, openHelp])
  return (
    <Page title={t('look.howHelp')} back>
      <div className="space-y-2 p-4">
        <button type="button" data-guide="help-assistant" className="flex min-h-14 w-full items-center justify-between rounded-xl bg-[var(--card)] px-3 text-left text-[15px] font-semibold shadow-sm" onClick={() => app.openHelp('ai')}>{t('help.ai')}<ChevronRight size={18} /></button>
        <button type="button" className="flex min-h-14 w-full items-center justify-between rounded-xl bg-[var(--card)] px-3 text-left text-[15px] font-semibold shadow-sm" onClick={() => app.openHelp('guides')}>{t('help.guide')}<ChevronRight size={18} /></button>
        <button type="button" data-guide="help-staff" className="flex min-h-14 w-full items-center justify-between rounded-xl bg-[var(--card)] px-3 text-left text-[15px] font-semibold shadow-sm" onClick={() => app.openHelp('staff')}><Headset size={18} /> {t('help.staff')}<ChevronRight size={18} /></button>
        <h2 className="pt-2 text-lg font-semibold">{t('help.journeys')}</h2>
        {JOURNEY_IDS.map((id) => (
          <button key={id} type="button" className="tap w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 text-left" onClick={() => navigate(`/flow/${id}?practice=1&tour=1`)}>
            {label(id, t)}
          </button>
        ))}
        <h2 className="pt-2 text-lg font-semibold">{t('staff.yourRequests')}</h2>
        {app.requests.filter((request) => request.userId === app.profile.id || (!request.userId && request.customerName === app.profile.name)).length === 0 && (
          <div data-guide="help-messages-empty" className="flex flex-col items-center gap-2 py-6 text-center">
            <MessageSquare size={32} strokeWidth={1.75} aria-hidden />
            <p>{t('look.noMessages')}</p>
            <button type="button" className="min-h-11 font-semibold text-[var(--link)] underline" onClick={() => app.openHelp('ai')}>{t('help.askOllie')}</button>
            <button type="button" className="min-h-11 font-semibold text-[var(--link)] underline" onClick={() => app.openHelp('staff')}>{t('help.staff')}</button>
          </div>
        )}
        <ul className="space-y-2">
          {app.requests.filter((request) => request.userId === app.profile.id || (!request.userId && request.customerName === app.profile.name)).map((request) => (
            <li key={request.ref} className="card p-3">
              <p className="font-semibold">{request.ref}</p>
              <p className="text-sm">{requestText(app.prefs.language, request)}</p>
              <p className="mt-1 text-sm">
                {t('staff.status')}: <strong>{t(`staff.${request.status}`)}</strong>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Page>
  )
}

const REWARDS = [
  { title: 'rewards.dining', cost: 'rewards.diningCost' },
  { title: 'rewards.grab', cost: 'rewards.grabCost' },
  { title: 'rewards.cash', cost: 'rewards.cashCost' },
] as const

export function Rewards() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const setScreen = app.setScreen
  useEffect(() => { setScreen('rewards') }, [setScreen])
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="flex h-14 items-center justify-between bg-[#E30613] px-3 text-white">
        <span className="w-11" />
        <h1 className="text-[16px] font-bold">{t('rewards.title')}</h1>
        <span className="flex items-center">
          <Link to="/help" className="flex h-11 w-11 items-center justify-center" aria-label={t('nav.help')}><Headset size={20} /></Link>
          <button type="button" className="min-h-11 pr-1 text-[15px] font-semibold underline" onClick={app.logout}>{t('look.logout')}</button>
        </span>
      </header>
      <main id="main" className="min-h-0 flex-1 overflow-y-auto px-4 pt-4" style={{ paddingBottom: 'calc(148px + var(--nav-safe, 0px))' }}>
        <section className="rounded-xl bg-[var(--card)] p-4 shadow-[0_8px_24px_rgba(47,53,61,0.06)]">
          <p className="text-[28px] font-bold leading-none">1,280 OCBC$</p>
          <p className="mt-2 text-[14px] text-[var(--muted)]">{t('rewards.earned')}</p>
        </section>
        <ul className="mt-4 space-y-3">
          {REWARDS.map((item) => (
            <li key={item.title} className="rounded-xl bg-[var(--card)] p-4 shadow-[0_8px_24px_rgba(47,53,61,0.06)]">
              <p className="text-[15px] font-bold">{t(item.title)}</p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">{t(item.cost)}</p>
              <button type="button" disabled className="mt-3 min-h-11 rounded-lg bg-[var(--soft)] px-4 text-[14px] font-semibold text-[var(--muted)]">{t('rewards.redeem')}</button>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-[var(--muted)]">{t('rewards.note')}</p>
      </main>
      <BottomNav />
    </div>
  )
}

export function More() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const [about, setAbout] = useState(false)
  const setScreen = app.setScreen
  useEffect(() => { setScreen('more') }, [setScreen])
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="flex h-14 items-center justify-between bg-[#E30613] px-3 text-white">
        <span className="w-11" />
        <h1 className="text-[16px] font-bold">{t('more.title')}</h1>
        <span className="flex items-center">
          <Link to="/help" className="flex h-11 w-11 items-center justify-center" aria-label={t('nav.help')}><Headset size={20} /></Link>
          <button type="button" className="min-h-11 pr-1 text-[15px] font-semibold underline" onClick={app.logout}>{t('look.logout')}</button>
        </span>
      </header>
      <main id="main" className="nav-clearance min-h-0 flex-1 overflow-y-auto">
        <section className="px-4 pt-4">
          <h2 className="text-[18px] font-bold">{t('look.newForYou')}</h2>
          <div className="mt-2 flex min-w-0 max-w-full gap-3 overflow-x-auto pb-2">
            {[t('look.cardOllie'), t('look.cardTours'), t('look.cardAccess'), t('look.cardScam')].map((text) => (
              <article key={text} className="w-[220px] shrink-0 rounded-xl bg-[var(--soft)] p-4 text-[var(--text)]">
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold text-white">{t('look.new')}</span>
                <p className="mt-2 text-[15px] font-bold">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="px-4 pt-2">
          <button type="button" className="flex min-h-12 w-full items-center justify-between text-left text-[15px] font-semibold" aria-expanded={about} onClick={() => setAbout((open) => !open)}>
            {t('look.access')}
            <ChevronRight className={about ? 'rotate-90' : ''} size={18} />
          </button>
          {about && (
            <div className="grid grid-cols-2 gap-2 pb-3">
              <Link to="/settings" className="rounded-xl bg-[var(--soft)] p-3 text-[13px] font-semibold">{t('more.settings')}</Link>
              <button type="button" className="rounded-xl bg-[var(--soft)] p-3 text-left text-[13px] font-semibold" onClick={() => startAppTour(tourState().index > 0)}>{t('more.tour')}</button>
              <Link to="/help" className="rounded-xl bg-[var(--soft)] p-3 text-[13px] font-semibold">{t('look.howHelp')}</Link>
              <label className="flex items-center gap-2 rounded-xl bg-[var(--soft)] p-3 text-[13px] font-semibold">
                <input type="checkbox" checked={app.prefs.spendingInsights} onChange={(e) => app.updatePrefs({ spendingInsights: e.target.checked })} />
                {t('settings.insights')}
              </label>
            </div>
          )}
        </section>
        <section className="px-4 pt-4">
          <h2 className="text-[18px] font-bold">{t('look.apply')}</h2>
          <Link to="/loans" className="mt-2 flex min-h-12 items-center justify-between">{t('look.loans')}<ChevronRight size={18} /></Link>
        </section>
        <section className="px-4 pt-2">
          <h2 className="text-[18px] font-bold">{t('look.services')}</h2>
          <Link to="/settings" className="mt-2 flex min-h-12 items-center justify-between">{t('more.settings')}<ChevronRight size={18} /></Link>
          <Link to="/notifications" className="flex min-h-12 items-center justify-between">{t('notifications.title')}<ChevronRight size={18} /></Link>
        </section>
      </main>
      <BottomNav />
    </div>
  )
}

export function Cards() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const setScreen = app.setScreen
  useEffect(() => { setScreen('cards') }, [setScreen])
  return (
    <Page title={t('cards.title')} back>
      <div className="space-y-3 p-4">
        {app.cards.map((card) => (
          <article key={card.id} className="card p-4">
            <h2 className="font-semibold">{t(card.nameKey)}</h2>
            <p>•••• {card.last4}</p>
            <p className="mt-1 flex items-center gap-2 font-semibold">
              {card.locked ? <Lock aria-hidden size={16} /> : <Check aria-hidden size={16} />}
              {card.locked ? t('flows.locked') : t('flows.unlocked')}
            </p>
          </article>
        ))}
        <Link to="/flow/card-lock" data-guide="cards-lock" className="tap flex items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--on-accent)]">{t('cards.lock')}</Link>
        <Link to="/flow/card-lost" className="tap flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--card)]">{t('cards.lost')}</Link>
      </div>
    </Page>
  )
}

export function InfoPage({ topic: topicProp }: { topic?: string } = {}) {
  const { topic: topicParam = 'investments' } = useParams()
  const topic = topicProp || topicParam
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const setScreen = app.setScreen
  useEffect(() => { setScreen(topic) }, [topic, setScreen])
  if (topic === 'money-lock' || topic === 'statements') {
    return (
      <Page title={t(topic === 'money-lock' ? 'look.moneyLock' : 'info.statements')} back>
        <div className="space-y-3 p-4">
          <article className="card p-4">
            <p>{t(topic === 'money-lock' ? 'info.moneyLockBody' : 'info.statementsBody')}</p>
          </article>
          {topic === 'money-lock' ? (
            <Link to="/flow/limit" className="ocbc-btn">{t('info.lockMoney')}</Link>
          ) : (
            <ul className="divide-y divide-[var(--line)] rounded-xl bg-[var(--card)]">
              {['Nov 2026', 'Oct 2026', 'Sep 2026'].map((month) => (
                <li key={month} className="flex min-h-12 items-center justify-between px-3 text-[15px] font-semibold">{month}</li>
              ))}
            </ul>
          )}
        </div>
      </Page>
    )
  }
  const key = topic === 'investments' || topic === 'insurance' || topic === 'loans' ? topic : 'investments'
  return (
    <Page title={t(`info.${key}`)} back>
      <div className="space-y-3 p-4">
        <article className="card p-4">
          <p>{t(`info.${key}Body`)}</p>
        </article>
        <button type="button" className="tap w-full rounded-xl bg-[var(--accent)] text-[var(--on-accent)]" onClick={() => app.openHelp('ai')}>{t('askAi')}</button>
        <button type="button" className="tap w-full rounded-xl border border-[var(--line)] bg-[var(--card)]" onClick={() => app.openHelp('staff')}>{t('getHelp')}</button>
      </div>
    </Page>
  )
}
