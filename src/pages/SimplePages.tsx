import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, Globe, Receipt, ScanLine, Smartphone, ArrowLeftRight, Headset } from 'lucide-react'
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
  useEffect(() => { app.setScreen('pay') }, [])
  const grid = [
    ['scan', '/flow/scan', ScanLine, 'pay-scan'],
    ['paynow', '/flow/paynow', Smartphone, 'pay-paynow'],
    ['transfer', '/flow/transfer', ArrowLeftRight, 'pay-transfer'],
    ['overseas', '/flow/overseas', Globe, 'pay-overseas'],
    ['bill', '/flow/bill', Receipt, 'pay-bill'],
  ] as const
  return (
    <Page title="">
      <div className="bg-gradient-to-b from-[#FFF6E8] to-[var(--bg)] px-4 pb-2 pt-2">
        <h1 className="max-w-[70%] text-[24px] font-bold leading-tight">{t('look.paymentsTitle')}</h1>
      </div>
      <div className="px-4">
        <div className="grid grid-cols-3 gap-y-4 rounded-xl bg-[var(--card)] p-4 shadow-[0_8px_24px_rgba(47,53,61,0.06)]">
          {grid.map(([id, to, Icon, guide]) => (
            <Link key={id} to={to} data-guide={guide} className="flex min-h-11 flex-col items-center gap-1 text-center">
              <Icon aria-hidden size={22} strokeWidth={1.5} />
              <span className="text-[13px] font-semibold">{label(id, t)}</span>
            </Link>
          ))}
        </div>
        <Link to="/flow/transfer?practice=1&tour=1" className="mt-3 flex items-center justify-between rounded-xl bg-[#F8E7E2] px-4 py-3">
          <span>
            <span className="mr-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold">{t('look.new')}</span>
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
  useEffect(() => {
    app.setScreen('help')
    if (new URLSearchParams(window.location.search).get('staff') === '1') app.openHelp('staff')
  }, [])
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
        {app.requests.length === 0 && <p>{t('staff.empty')}</p>}
        <ul className="space-y-2">
          {app.requests.map((request) => (
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

export function More() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const [about, setAbout] = useState(false)
  useEffect(() => { app.setScreen('more') }, [])
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
      <main id="main" className="mb-[76px] min-h-0 flex-1 overflow-y-auto">
        <section className="px-4 pt-4">
          <h2 className="text-[18px] font-bold">{t('look.newForYou')}</h2>
          <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
            {[t('look.cardOllie'), t('look.cardTours'), t('look.cardAccess'), t('look.cardScam')].map((text) => (
              <article key={text} className="w-[220px] shrink-0 rounded-xl bg-[#F8E7E2] p-4">
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold">{t('look.new')}</span>
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
      </main>
      <BottomNav />
    </div>
  )
}

export function Cards() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  useEffect(() => { app.setScreen('cards') }, [])
  return (
    <Page title={t('cards.title')} back>
      <div className="space-y-3 p-4">
        {app.cards.map((card) => (
          <article key={card.id} className="card p-4">
            <h2 className="font-semibold">{t(card.nameKey)}</h2>
            <p>•••• {card.last4}</p>
            <p className="mt-1 flex items-center gap-2 font-semibold">
              <span aria-hidden>{card.locked ? '⊘' : '✓'}</span>
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
  useEffect(() => { app.setScreen(topic) }, [topic])
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
