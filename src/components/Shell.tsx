import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ChevronLeft, CircleHelp, Home, Menu, Wallet, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { JOURNEY_IDS } from '@/data/flows'
import { translate } from '@/i18n'
import { journeyRoute } from '@/lib/showHow'
import { themeVars } from '@/lib/accent'
import { AppTour } from './AppTour'
import { AiPanel } from './AiPanel'
import { StaffPanel } from './StaffPanel'
import { speak, stopSpeaking } from '@/lib/speech'
import { SpeakButton } from './SpeakButton'

const NAV = [
  { to: '/', key: 'nav.home', icon: Home, guide: 'nav-home', end: true },
  { to: '/accounts', key: 'nav.accounts', icon: Wallet, guide: 'nav-accounts', end: false },
  { to: '/pay', key: 'nav.pay', icon: ArrowLeftRight, guide: 'nav-pay', end: false },
  { to: '/help', key: 'nav.help', icon: CircleHelp, guide: 'nav-help', end: false },
  { to: '/more', key: 'nav.more', icon: Menu, guide: 'nav-more', end: false },
]

function usePhoneScale() {
  const [state, setState] = useState({ scale: 1, full: false })
  useEffect(() => {
    const update = () => {
      const full = window.innerWidth <= 480
      const scale = full ? 1 : Math.min(1, (window.innerHeight - 72) / 844)
      setState({ scale, full })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return state
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { prefs, announce } = useApp()
  const { scale, full } = usePhoneScale()
  const vars = themeVars(prefs)
  return (
    <div className="phone-stage" style={full ? { background: vars['--bg'] } : undefined}>
      <div style={full ? undefined : { width: 390 * scale, height: 844 * scale }}>
      <div className={full ? 'phone-frame is-full' : 'phone-frame'} style={full ? undefined : { transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {!full && <div className="phone-notch" aria-hidden />}
        <div
          id="customer-root"
          className="relative flex h-full flex-col"
          data-scheme={prefs.scheme}
          data-contrast={prefs.highContrast ? 'high' : 'normal'}
          data-bold={prefs.boldText ? 'true' : 'false'}
          data-cvd={prefs.colourVision}
          style={{ ...vars, paddingTop: full ? 'env(safe-area-inset-top)' : '28px' }}
        >
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2">
            {translate(prefs.language, 'skipToContent')}
          </a>
          {children}
          <div className="sr-only" aria-live="polite">{announce}</div>
          <HelpLayer />
        </div>
      </div>
      </div>
      {!full && (
        <a href="/admin" className="mt-4 text-sm font-semibold underline" style={{ color: '#0b4f9e' }}>
          {translate(prefs.language, 'adminNote')}
        </a>
      )}
    </div>
  )
}

export function DemoBadge() {
  const { prefs } = useApp()
  return (
    <span className="inline-flex max-w-full rounded-full bg-[var(--soft)] px-2 py-0.5 text-center text-[0.7rem] font-medium leading-snug text-[var(--muted)]">
      {translate(prefs.language, 'demoBadge')}
    </span>
  )
}

export function HeaderHelp({ guide = false }: { guide?: boolean }) {
  const app = useApp()
  if (app.prefs.textSize < 22) return null
  const t = (key: string) => translate(app.prefs.language, key)
  return (
    <button
      type="button"
      data-guide={guide ? 'help-fab' : undefined}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--link)]"
      aria-label={t('help.fab')}
      aria-haspopup="dialog"
      aria-expanded={app.helpOpen}
      onClick={() => app.openHelp('menu')}
    >
      <CircleHelp aria-hidden size={24} />
    </button>
  )
}

export function BottomNav() {
  const { prefs } = useApp()
  const t = (key: string) => translate(prefs.language, key)
  const iconsOnly = prefs.textSize >= 20
  return (
    <nav aria-label={t('nav.home')} className="grid min-h-[64px] grid-cols-5 border-t border-[var(--line)] bg-[var(--card)]">
      {NAV.map((item) => {
        const Icon = item.icon
        const label = t(item.key)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-guide={item.guide}
            aria-label={label}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden px-0.5 py-1 text-center text-[0.7rem] font-medium leading-snug ${isActive ? 'text-[var(--link)]' : 'text-[var(--muted)]'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon aria-hidden size={24} strokeWidth={isActive ? 2.4 : 1.8} />
                {!iconsOnly && <span className="w-full truncate">{label}</span>}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

function HelpLayer() {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const hideFab = app.prefs.textSize >= 22
    || !app.sessionId
    || location.pathname.startsWith('/onboarding')
    || location.pathname.startsWith('/join')
    || location.pathname.startsWith('/welcome')
    || location.pathname.startsWith('/login')
    || location.pathname.startsWith('/pre')
    || location.pathname.startsWith('/flow')
    || location.pathname.startsWith('/help')
    || (app.helpOpen && app.helpView === 'ai')
  const aiFull = app.helpOpen && app.helpView === 'ai'
  const [fabHidden, setFabHidden] = useState(false)
  useEffect(() => {
    const main = document.getElementById('main')
    if (!main) return
    let last = 0
    const onScroll = () => {
      const y = main.scrollTop
      setFabHidden(y > last && y > 24)
      last = y
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [location.pathname])
  useEffect(() => {
    app.setGuidePrompt(null)
    app.setNotice('')
  }, [location.pathname])

  useEffect(() => {
    if (!app.helpOpen) stopSpeaking()
  }, [app.helpOpen])
  useEffect(() => {
    const onCantonese = () => app.setNotice(t('speech.cantoneseDown'))
    window.addEventListener('ocbc-cantonese', onCantonese)
    return () => window.removeEventListener('ocbc-cantonese', onCantonese)
  }, [app, t])
  useEffect(() => {
    if (!app.helpOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopSpeaking()
        app.setHelpOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [app])

  return (
    <>
      {!hideFab && !fabHidden && (
      <button
        type="button"
        data-guide="help-fab"
        className="absolute bottom-[76px] right-3 z-30 flex min-h-11 items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-[0.8rem] font-semibold leading-snug text-[var(--link)] shadow-card"
        onClick={() => app.openHelp('menu')}
        aria-haspopup="dialog"
        aria-expanded={app.helpOpen}
      >
        <CircleHelp aria-hidden size={22} />
        {t('help.fab')}
      </button>
      )}
      {app.notice && (
        <div role="status" className="absolute bottom-36 left-3 right-3 z-30 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-lg">
          <p>{app.notice}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="tap rounded-xl bg-[var(--accent)] px-3 text-[var(--on-accent)]" onClick={() => { app.setNotice(''); app.openHelp('ai') }}>
              {t('askAi')}
            </button>
            <button type="button" className="tap rounded-xl border border-[var(--line)] px-3" onClick={() => app.setNotice('')}>{t('close')}</button>
          </div>
        </div>
      )}
      {app.helpOpen && (
        <div className={`absolute inset-0 z-40 flex flex-col ${aiFull ? '' : 'justify-end'}`}>
          {!aiFull && <button type="button" className="absolute inset-0 bg-black/45" aria-label={t('close')} onClick={() => app.setHelpOpen(false)} />}
          <div role="dialog" aria-modal="true" aria-labelledby="help-title" className={aiFull ? 'relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--bg)] p-4 text-[var(--text)]' : 'relative max-h-[86%] overflow-y-auto rounded-t-3xl bg-[var(--card)] p-4 text-[var(--text)]'}>
            <div className="mb-3 flex items-center justify-between">
              <h2 id="help-title" className="text-xl font-semibold">{t('help.title')}</h2>
              <button type="button" className="tap rounded-full border border-[var(--line)] px-3" onClick={() => app.setHelpOpen(false)} aria-label={t('close')}>
                <X aria-hidden size={18} />
              </button>
            </div>
            {app.helpView === 'menu' && (
              <div className="space-y-2">
                {([
                  ['ai', 'help.ai'],
                  ['guides', 'help.guide'],
                  ['staff', 'help.staff'],
                ] as const).map(([view, key]) => (
                  <button key={view} type="button" className="tap flex min-h-12 w-full items-center rounded-2xl border border-[var(--line)] px-3 text-left font-semibold" onClick={() => app.setHelpView(view)}>
                    {t(key)}
                  </button>
                ))}
              </div>
            )}
            {app.helpView === 'guides' && (
              <div className="space-y-2">
                <h3 className="font-semibold">{t('help.journeys')}</h3>
                {JOURNEY_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="tap w-full rounded-2xl border border-[var(--line)] px-3 text-left"
                    onClick={() => {
                      app.setHelpOpen(false)
                      navigate(`/flow/${id}?practice=1&tour=1`)
                    }}
                  >
                    {t(id === 'card-lock' ? 'flows.cardLock' : id === 'card-lost' ? 'flows.cardLost' : id === 'limit' ? 'flows.limit' : `flows.${id}`)}
                  </button>
                ))}
              </div>
            )}
            {app.helpView === 'ai' && <AiPanel />}
            {app.helpView === 'staff' && <StaffPanel />}
          </div>
        </div>
      )}
      <AppTour />
      {app.guidePrompt && (
        <div className="absolute bottom-20 left-3 right-3 z-30">
          <div role="dialog" aria-labelledby="guide-done" className="w-full rounded-3xl border border-[var(--line)] bg-[var(--card)] p-4 text-[var(--text)] shadow-lg">
            <p id="guide-done" className="font-semibold">{t('guideDone')}</p>
            <button
              type="button"
              className="mt-4 min-h-12 w-full rounded-2xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
              onClick={() => {
                const prompt = app.guidePrompt
                app.setGuidePrompt(null)
                if (prompt?.practice) navigate(journeyRoute(prompt.journeyId))
              }}
            >
              {t('yes')}
            </button>
            <button type="button" className="mt-2 min-h-12 w-full rounded-2xl border border-[var(--line)]" onClick={() => app.setGuidePrompt(null)}>
              {t('close')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function Page({
  title,
  children,
  back,
}: {
  title?: string
  children: React.ReactNode
  back?: boolean
}) {
  const navigate = useNavigate()
  const { prefs } = useApp()
  const t = (key: string) => translate(prefs.language, key)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const [speakingTitle, setSpeakingTitle] = useState(false)
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
    if (sessionStorage.getItem('ocbc-app-tour')?.includes('"active":true')) return
    stopSpeaking()
    if (!prefs.readAloud || !title) return
    setSpeakingTitle(true)
    void speak(title, { language: prefs.language, rate: prefs.speechRate, dialect: prefs.dialect }).finally(() => setSpeakingTitle(false))
  }, [location.pathname])
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="relative flex min-h-14 items-center justify-center border-b border-[var(--line)] bg-[var(--card)] px-12 py-2">
        {back && (
          <button type="button" className="absolute left-1 flex min-h-11 min-w-11 items-center justify-center" onClick={() => navigate(-1)} aria-label={t('back')}>
            <ChevronLeft aria-hidden size={26} />
          </button>
        )}
        <div className="flex min-w-0 flex-col items-center gap-1">
          {title && (
            <span className="flex items-center gap-1">
              <h1 className="text-center text-[1.05rem] font-semibold leading-normal">{title}</h1>
              <SpeakButton
                playing={speakingTitle}
                listenLabel={t('speech.readAloud')}
                stopLabel={t('stop')}
                onClick={() => {
                  if (speakingTitle) {
                    stopSpeaking()
                    setSpeakingTitle(false)
                    return
                  }
                  setSpeakingTitle(true)
                  void speak(title, { language: prefs.language, rate: prefs.speechRate, dialect: prefs.dialect }).finally(() => setSpeakingTitle(false))
                }}
              />
            </span>
          )}
          <DemoBadge />
        </div>
        <span className="absolute right-1 top-1"><HeaderHelp /></span>
      </header>
      <main id="main" ref={mainRef} key={location.pathname} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg)] pb-36">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
