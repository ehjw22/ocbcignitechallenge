import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, CreditCard, Globe, QrCode, Receipt, RefreshCw, Smartphone, ArrowLeftRight, Lock, Target, ShieldAlert, Info } from 'lucide-react'
import { Page } from '@/components/Shell'
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
  const icons: Record<string, typeof Smartphone> = {
    paynow: Smartphone,
    transfer: ArrowLeftRight,
    overseas: Globe,
    bill: Receipt,
    giro: RefreshCw,
    scan: QrCode,
    goal: Target,
    'card-lock': Lock,
    'card-lost': ShieldAlert,
    limit: CreditCard,
  }
  return (
    <Page title={t('pay.title')}>
      <div className="pt-3">
        <p className="px-4 pb-3 text-[0.85rem] leading-normal text-[var(--muted)]">{t('pay.body')}</p>
        <ul className="overflow-hidden border-y border-[var(--line)] bg-[var(--card)]">
          {PAY_LINKS.map(([id, to]) => {
            const Icon = icons[id] ?? ArrowLeftRight
            return (
              <li key={id} className="border-b border-[#F2F2F2] last:border-0">
                <Link to={to} data-guide={`pay-${id}`} className="ocbc-row">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--soft)] text-[var(--link)]">
                    <Icon aria-hidden size={18} />
                  </span>
                  <span className="flex-1 text-[16px]">{label(id, t)}</span>
                  <ChevronRight aria-hidden size={18} className="text-[var(--muted)]" />
                </Link>
              </li>
            )
          })}
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
    <Page title={t('nav.help')}>
      <div className="space-y-3 p-4">
        <button type="button" data-guide="help-assistant" className="tap w-full rounded-2xl bg-[var(--accent)] text-[var(--on-accent)]" onClick={() => app.openHelp('ai')}>{t('help.ai')}</button>
        <button type="button" className="tap w-full rounded-2xl border border-[var(--line)] bg-[var(--card)]" onClick={() => app.openHelp('guides')}>{t('help.guide')}</button>
        <button type="button" data-guide="help-staff" className="tap w-full rounded-2xl border border-[var(--line)] bg-[var(--card)]" onClick={() => app.openHelp('staff')}>{t('help.staff')}</button>
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
    <Page title={t('more.title')}>
      <div className="space-y-2 p-4">
        {[
          ['/settings', t('more.settings')],
          ['/cards', t('more.cards')],
          ['/flow/limit', t('more.limit')],
        ].map(([to, text]) => (
          <Link key={to} to={to} className="card tap flex items-center px-3 font-semibold">{text}</Link>
        ))}
        <label className="card flex min-h-tap items-center gap-3 px-3">
          <input type="checkbox" checked={app.prefs.spendingInsights} onChange={(e) => app.updatePrefs({ spendingInsights: e.target.checked })} />
          {t('settings.insights')}
        </label>
        <button
          type="button"
          className="card tap w-full px-3 text-left font-semibold"
          onClick={() => startAppTour(tourState().index > 0)}
        >
          {t('more.tour')}
        </button>
        <button type="button" className="card tap flex w-full items-center gap-2 px-3 text-left font-semibold" aria-expanded={about} onClick={() => setAbout((open) => !open)}>
          <Info aria-hidden size={20} />
          {t('more.about')}
        </button>
        {about && (
          <article className="card p-3">
            <h2 className="font-semibold">{t('more.about')}</h2>
            <p className="mt-1">{t('more.aboutBody')}</p>
          </article>
        )}
      </div>
    </Page>
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
  const { topic: topicParam = 'rewards' } = useParams()
  const topic = topicProp || topicParam
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  useEffect(() => { app.setScreen(topic) }, [topic])
  const key = topic === 'investments' || topic === 'insurance' || topic === 'rewards' ? topic : 'rewards'
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
