import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ChevronLeft, Headset, House, Sprout, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { JOURNEY_IDS } from '@/data/flows'
import { translate } from '@/i18n'
import { journeyRoute } from '@/lib/showHow'
import { themeVars } from '@/lib/accent'
import { AppTour } from './AppTour'
import { FlowTour } from './TourFrame'
import { getFlowTour, subscribeFlowTour } from '@/lib/guide'
import { scamSheetOpen, subscribeScamSheet } from '@/lib/scamCheck'
import { tourState } from '@/lib/appTour'
import { AiPanel } from './AiPanel'
import { StaffPanel } from './StaffPanel'
import { speak, stopSpeaking } from '@/lib/speech'
import { SpeakButton } from './SpeakButton'

const NAV = [
  { to: '/', key: 'nav.home', guide: 'nav-home', end: true, center: false },
  { to: '/plan', key: 'nav.plan', guide: 'nav-plan', end: false, center: false },
  { to: '/pay', key: 'nav.pay', guide: 'nav-pay', end: false, center: true },
  { to: '/more', key: 'nav.more', guide: 'nav-more', end: false, center: false },
]

function MoreGlyph({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      {[4, 14].map((y) => [4, 14].map((x) => (
        <circle key={`${x}-${y}`} cx={x + 2} cy={y + 2} r={active ? 2.4 : 2} fill="none" stroke="currentColor" strokeWidth="1.5" />
      )))}
    </svg>
  )
}

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
      <div className={full ? 'w-full min-w-0 max-w-full self-stretch' : undefined} style={full ? undefined : { width: 390 * scale, height: 844 * scale }}>
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
  const { prefs } = useApp()
  const t = (key: string) => translate(prefs.language, key)
  return (
    <NavLink
      to="/help"
      data-guide={guide ? 'nav-help' : undefined}
      className="flex min-h-11 min-w-11 items-center justify-center text-[var(--text)]"
      aria-label={t('nav.help')}
    >
      <Headset aria-hidden size={22} strokeWidth={1.5} />
    </NavLink>
  )
}

export function BottomNav() {
  const { prefs } = useApp()
  const scamOpen = useSyncExternalStore(subscribeScamSheet, scamSheetOpen, () => false)
  const t = (key: string) => translate(prefs.language, key)
  const location = useLocation()
  if (scamOpen || location.pathname.startsWith('/flow')) return null
  return (
    <nav aria-label={t('nav.home')} className="grid min-h-[72px] grid-cols-4 border-t border-[var(--line)] bg-[var(--card)]">
      {NAV.map((item) => {
        const label = t(item.key)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-guide={item.guide}
            aria-label={label}
            className={({ isActive }) =>
              `flex min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden px-0.5 py-1 text-center text-[11px] font-semibold leading-tight ${isActive ? 'text-[#E30613]' : 'text-[var(--muted)]'}`
            }
          >
            {({ isActive }) => (
              <>
                {item.center ? (
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${isActive ? 'bg-[#E30613] text-white' : 'border border-[var(--line)] text-[var(--text)]'}`}>
                    <ArrowLeftRight aria-hidden size={18} strokeWidth={1.7} />
                  </span>
                ) : item.to === '/' ? (
                  <House aria-hidden size={22} strokeWidth={1.5} fill={isActive ? 'currentColor' : 'none'} />
                ) : item.to === '/plan' ? (
                  <Sprout aria-hidden size={22} strokeWidth={1.5} />
                ) : (
                  <MoreGlyph active={isActive} />
                )}
                <span className="line-clamp-2 w-full text-[11px] leading-tight">{label}</span>
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

const OLLIE_LABEL_KEY = 'ocbc-ollie-fab-label'

function OllieFab() {
  const app = useApp()
  const location = useLocation()
  const flowTour = useSyncExternalStore(subscribeFlowTour, getFlowTour, getFlowTour)
  const appTour = useSyncExternalStore(
    (listener) => {
      window.addEventListener('ocbc-tour', listener)
      return () => window.removeEventListener('ocbc-tour', listener)
    },
    () => tourState().active,
    () => false,
  )
  const scamOpen = useSyncExternalStore(subscribeScamSheet, scamSheetOpen, () => false)
  const [hideReview, setHideReview] = useState(false)
  const [showLabel, setShowLabel] = useState(() => localStorage.getItem(OLLIE_LABEL_KEY) !== '1')
  const [lift, setLift] = useState(88)
  const [tucked, setTucked] = useState(false)
  const hiddenPath = ['/welcome', '/login', '/join', '/onboarding'].includes(location.pathname) || location.pathname.startsWith('/pre')
  useEffect(() => {
    const sync = () => setHideReview(document.getElementById('customer-root')?.getAttribute('data-hide-fab') === '1')
    sync()
    window.addEventListener('ocbc-chrome', sync)
    return () => window.removeEventListener('ocbc-chrome', sync)
  }, [location.pathname])
  useEffect(() => {
    if (!showLabel) return
    const timer = window.setTimeout(() => {
      localStorage.setItem(OLLIE_LABEL_KEY, '1')
      setShowLabel(false)
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [showLabel])
  useEffect(() => {
    const root = document.getElementById('customer-root')
    if (!root) return
    const measure = () => {
      const nav = root.querySelector('nav')
      const navH = nav?.getBoundingClientRect().height ?? 64
      const sticky = [...root.querySelectorAll('.sticky')].find((el) => {
        if (el.closest('nav')) return false
        const style = getComputedStyle(el)
        return style.position === 'sticky' && style.bottom === '0px' && Boolean(el.querySelector('button'))
      })
      setTucked(Boolean(sticky))
      setLift(navH + 12)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [location.pathname, app.helpOpen])
  if (hiddenPath || tucked || appTour || flowTour || scamOpen || hideReview || (app.helpOpen && app.helpView === 'ai')) return null
  const label = translate(app.prefs.language, 'help.askOllie')
  return (
    <button
      type="button"
      className="absolute right-3 z-30 flex items-center rounded-full text-white"
      style={{ bottom: lift, height: 56, background: '#E30613', boxShadow: '0 4px 14px rgba(0,0,0,0.28)' }}
      aria-label={label}
      onClick={() => {
        localStorage.setItem(OLLIE_LABEL_KEY, '1')
        setShowLabel(false)
        app.openHelp('ai')
      }}
    >
      {showLabel && <span className="max-w-[11rem] truncate pl-4 pr-1 text-[15px] font-semibold leading-none">{label}</span>}
      <span aria-hidden className="grid shrink-0 place-items-center text-lg font-bold" style={{ width: 56, height: 56 }}>O</span>
    </button>
  )
}

function HelpLayer() {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const aiFull = app.helpOpen && app.helpView === 'ai'
  useEffect(() => {
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
      <OllieFab />
      <AppTour />
      <FlowTour />
    </>
  )
}

export function ExplainButton() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  return (
    <button
      type="button"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] text-base font-semibold"
      aria-label={t('ai.what')}
      onClick={() => {
        const root = document.getElementById('main') || document.getElementById('customer-root')
        const labels = [...(root?.querySelectorAll('h1, h2, label, button') || [])]
          .map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim())
          .filter((item) => item && item.length < 80)
          .slice(0, 12)
          .join(' | ')
        app.openHelp('ai')
        app.setAiSeed(`__explain__:${labels}`)
      }}
    >
      ?
    </button>
  )
}

export function GuideDone() {
  const app = useApp()
  const navigate = useNavigate()
  const t = (key: string) => translate(app.prefs.language, key)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!app.guidePrompt) return
    const dismiss = () => {
      const prompt = app.guidePrompt
      if (prompt) sessionStorage.setItem('ocbc-guide-prompt', prompt.journeyId)
      app.setGuidePrompt(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) dismiss()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [app])
  if (!app.guidePrompt) return null
  return (
    <div ref={ref} className="mx-4 mt-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3">
      <p className="font-semibold">{t('guideDone')}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="min-h-11 flex-1 rounded-xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
          onClick={() => {
            const prompt = app.guidePrompt
            if (prompt) sessionStorage.setItem('ocbc-guide-prompt', prompt.journeyId)
            app.setGuidePrompt(null)
            if (prompt?.practice) navigate(journeyRoute(prompt.journeyId))
          }}
        >
          {t('continue')}
        </button>
        <button
          type="button"
          className="min-h-11 flex-1 rounded-xl border border-[var(--line)] font-semibold"
          onClick={() => {
            const prompt = app.guidePrompt
            if (prompt) sessionStorage.setItem('ocbc-guide-prompt', prompt.journeyId)
            app.setGuidePrompt(null)
          }}
        >
          {t('close')}
        </button>
      </div>
    </div>
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
      <header className="relative flex min-h-14 items-center justify-center border-b border-[var(--line)] bg-[var(--card)] px-3 py-2">
        <span className="absolute left-1 flex items-center">
          {back && (
            <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={() => navigate(-1)} aria-label={t('back')}>
              <ChevronLeft aria-hidden size={26} />
            </button>
          )}
          {title && (
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
          )}
        </span>
        <div className="flex max-w-[52%] flex-col items-center">
          {title && <h1 className="w-full truncate text-center text-[1.05rem] font-semibold leading-normal">{title}</h1>}
          <DemoBadge />
        </div>
        <span className="absolute right-1 flex items-center">
          <ExplainButton />
        </span>
      </header>
      <main id="main" ref={mainRef} key={location.pathname} className={`${location.pathname.startsWith('/flow') ? '' : 'mb-[76px]'} min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg)]`}>
        <GuideDone />
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
