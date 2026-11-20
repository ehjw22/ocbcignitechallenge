import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeftRight, ChevronLeft, Gift, Headset, House, Sprout, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { JOURNEY_IDS } from '@/data/flows'
import { translate } from '@/i18n'
import { journeyRoute } from '@/lib/showHow'
import { loadTourProgress } from '@/lib/tourProgress'
import { nextPracticeJourney, JOURNEY_TOUR_IDS } from '@/lib/recommendedTours'
import { practisedJourneyCount } from '@/lib/tourTracking'
import { themeVars } from '@/lib/accent'
import { readingComfortVars, textDisplayVars } from '@/lib/readingComfort'
import { ReadingRuler } from '@/components/ReadingRuler'
import { AppTour } from './AppTour'
import { FlowTour } from './TourFrame'
import { getFlowTour, subscribeFlowTour } from '@/lib/guide'
import { scamSheetOpen, subscribeScamSheet } from '@/lib/scamCheck'
import { tourState } from '@/lib/appTour'
import { AiPanel } from './AiPanel'
import { StaffPanel } from './StaffPanel'
import { speak, stopSpeaking } from '@/lib/speech'
import { readableText } from '@/lib/tourPlace'
import { SpeakButton } from './SpeakButton'
import {
  readTapsVisualizer,
  subscribePresent,
  toggleTapsVisualizer,
  usePhoneScale,
  usePresentMode,
} from '@/lib/present'

const NAV = [
  { to: '/', key: 'nav.home', guide: 'nav-home', end: true, center: false },
  { to: '/plan', key: 'nav.plan', guide: 'nav-plan', end: false, center: false },
  { to: '/pay', key: 'nav.pay', guide: 'nav-pay', end: false, center: true },
  { to: '/rewards', key: 'nav.rewards', guide: 'nav-rewards', end: false, center: false },
  { to: '/more', key: 'nav.more', guide: 'nav-more', end: false, center: false },
]

function MoreGlyph({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 22 22" aria-hidden>
      {[4, 14].map((y) => [4, 14].map((x) => (
        <circle key={`${x}-${y}`} cx={x + 2} cy={y + 2} r={active ? 3 : 2.5} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
      )))}
    </svg>
  )
}

// Filled house for the active Home tab (OCBC app style): solid shape with a cut-out door.
function HomeFilled() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.6 2.8 10.2c-.5.4-.8 1-.8 1.6V20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.2c0-.6-.3-1.2-.8-1.6Z" fill="currentColor" />
      <rect x="9.5" y="14" width="5" height="8" rx="1" fill="var(--card, #fff)" />
    </svg>
  )
}

function TapVisualizer() {
  const tapsOn = useSyncExternalStore(subscribePresent, readTapsVisualizer, () => false)
  const [dots, setDots] = useState<{ x: number; y: number; id: number }[]>([])
  useEffect(() => {
    if (!tapsOn) return
    const root = document.getElementById('customer-root')
    if (!root) return
    let serial = 0
    const onDown = (event: PointerEvent) => {
      const box = root.getBoundingClientRect()
      const id = ++serial
      setDots((prev) => [...prev, { x: event.clientX - box.left, y: event.clientY - box.top, id }])
      window.setTimeout(() => setDots((prev) => prev.filter((dot) => dot.id !== id)), 400)
    }
    root.addEventListener('pointerdown', onDown)
    return () => root.removeEventListener('pointerdown', onDown)
  }, [tapsOn])
  if (!tapsOn || dots.length === 0) return null
  return (
    <div className="pointer-events-none absolute inset-0 z-[60]" aria-hidden>
      {dots.map((dot) => (
        <span key={dot.id} className="present-tap" style={{ left: dot.x - 18, top: dot.y - 18 }} />
      ))}
    </div>
  )
}

function JudgeScript() {
  const { prefs } = useApp()
  const location = useLocation()
  const judge = new URLSearchParams(location.search).get('demo') === 'judge'
  if (!judge) return null
  const t = (key: string) => translate(prefs.language, key)
  const links = [
    ['/', '?tour=1', 'judge.homeTour'],
    ['/flow/paynow?practice=1&tour=1', '', 'judge.paynow'],
    ['/help', '', 'judge.ollie'],
    ['/flow/paynow', '', 'judge.scam'],
    ['/settings', '', 'judge.customise'],
    ['/join', '?langs=core', 'judge.tamil'],
  ] as const
  return (
    <aside className="present-chrome fixed bottom-24 left-4 z-[120] max-w-[220px] rounded-xl border border-zinc-600 bg-[#1a1f24] p-3 text-sm text-white shadow-lg">
      <p className="mb-2 font-bold">{t('judge.title')}</p>
      <ol className="space-y-1">
        {links.map(([path, query, key], index) => (
          <li key={key}>
            <a className="underline opacity-90 hover:opacity-100" href={`${path}${query}`}>{index + 1}. {t(key)}</a>
          </li>
        ))}
      </ol>
    </aside>
  )
}

function presentChromeAnchor(scale: number) {
  if (typeof window === 'undefined') return { bottom: 24, right: 16 }
  const phoneW = 390 * scale
  const phoneH = 844 * scale
  const phoneRight = window.innerWidth / 2 + phoneW / 2
  const phoneTop = (window.innerHeight - phoneH) / 2
  const gap = 16
  const stackW = 148
  if (phoneRight + gap + stackW <= window.innerWidth - 8) {
    return {
      left: phoneRight + gap,
      bottom: Math.max(16, window.innerHeight - phoneTop - phoneH + 16),
    }
  }
  if (phoneTop > 120) {
    return { right: 16, top: Math.max(16, phoneTop - 8) }
  }
  return { right: 16, bottom: Math.max(16, (window.innerHeight - phoneH) / 2) }
}

function PresentChrome({ full }: { full: boolean }) {
  const { prefs } = useApp()
  const { present, toggle, exit } = usePresentMode()
  const { scale } = usePhoneScale()
  const tapsOn = useSyncExternalStore(subscribePresent, readTapsVisualizer, () => false)
  const t = (key: string) => translate(prefs.language, key)
  const anchor = presentChromeAnchor(scale)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (event.target as HTMLElement | null)?.isContentEditable) return
      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault()
        toggle()
      }
      if (event.key === 'Escape' && present) exit()
      if (present && (event.key === 't' || event.key === 'T')) toggleTapsVisualizer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [present, toggle, exit])

  if (full) return null
  const chromeBtn =
    'present-chrome flex min-h-12 min-w-[11rem] items-center justify-center rounded-xl border border-zinc-600 bg-[#1a1f24] px-4 text-sm font-semibold text-white shadow-lg transition hover:bg-[#252b32]'
  return (
    <>
      <div
        className="present-chrome fixed z-[120] flex max-[480px]:hidden flex-col gap-2"
        style={anchor}
        role="toolbar"
        aria-label={t('present.enterMode')}
      >
        <button type="button" className={chromeBtn} onClick={toggle}>
          {present ? t('present.exitMode') : t('present.enterMode')}
        </button>
        {present && (
          <button type="button" className={chromeBtn} onClick={() => toggleTapsVisualizer()}>
            {tapsOn ? t('present.tapsOff') : t('present.tapsOn')}
          </button>
        )}
        {present && (
          <button type="button" className={`${chromeBtn} text-white/90`} onClick={exit}>
            {t('present.exitLink')}
          </button>
        )}
      </div>
      <JudgeScript />
    </>
  )
}

export { usePhoneScale }

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { prefs, announce } = useApp()
  const { scale, full, present } = usePhoneScale()
  const theme = themeVars(prefs)
  const comfort = { ...readingComfortVars(prefs), ...textDisplayVars(prefs.textSize) }
  const stageBg = present && !full ? '#0f1316' : theme['--bg']
  return (
    <div className="phone-stage" style={{ background: full ? theme['--bg'] : stageBg, minHeight: full ? undefined : '100dvh', display: full ? undefined : 'flex', flexDirection: full ? undefined : 'column', alignItems: full ? undefined : 'center', justifyContent: full ? undefined : 'center' }}>
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
          lang={prefs.language}
          style={{ ...theme, ...comfort, paddingTop: full ? 'env(safe-area-inset-top)' : '28px' }}
        >
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2">
            {translate(prefs.language, 'skipToContent')}
          </a>
          {children}
          <TapVisualizer />
          <div className="sr-only" aria-live="polite">{announce}</div>
          <ReadingRuler />
          <HelpLayer />
        </div>
      </div>
      </div>
      {!full && !present && (
        <a href="/admin" className="mt-4 text-sm font-semibold underline" style={{ color: '#0b4f9e' }}>
          {translate(prefs.language, 'adminNote')}
        </a>
      )}
      <PresentChrome full={full} />
    </div>
  )
}

export function DemoBadge() {
  const { prefs } = useApp()
  return (
    <span className="inline-flex max-w-full rounded-full bg-[var(--soft)] px-2 py-0.5 text-center text-[0.7rem] font-medium leading-snug text-[var(--text)]">
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
    <nav aria-label={t('nav.home')} className="app-nav">
      <div className="grid min-h-[64px] grid-cols-5">
      {NAV.map((item) => {
        const shortKey = prefs.language === 'ta' ? `navShort.${item.key.split('.')[1]}` : item.key
        const short = prefs.language === 'ta' ? translate(prefs.language, shortKey) : ''
        const label = short && short !== shortKey ? short : t(item.key)
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            data-guide={item.guide}
            aria-label={label}
            className={({ isActive }) =>
              `flex min-h-[64px] min-w-0 flex-col items-center justify-start overflow-hidden px-0.5 pt-1.5 text-center text-[0.7rem] font-normal leading-tight ${isActive ? 'text-[var(--accent-text)]' : 'text-[var(--text)]'}`
            }
            style={{ gap: 2 }}
          >
            {({ isActive }) => (
              <>
                <span aria-hidden className="flex h-10 items-center justify-center">
                {item.to === '/pay' ? (
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full border-[1.5px]"
                    style={isActive ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--on-accent)' } : { borderColor: 'currentColor' }}
                  >
                    <ArrowLeftRight aria-hidden size={22} strokeWidth={1.5} />
                  </span>
                ) : item.to === '/' ? (
                  isActive ? <HomeFilled /> : <House aria-hidden size={24} strokeWidth={1.5} />
                ) : item.to === '/plan' ? (
                  <Sprout aria-hidden size={24} strokeWidth={1.5} />
                ) : item.to === '/rewards' ? (
                  <Gift aria-hidden size={24} strokeWidth={1.5} />
                ) : (
                  <MoreGlyph active={isActive} />
                )}
                </span>
                <span className="line-clamp-2 flex min-h-[2.2em] w-full items-center justify-center whitespace-normal text-center font-normal leading-tight [font-size:clamp(11px,3.2vw,0.8em)] [overflow-wrap:normal] [word-break:keep-all]">{label}</span>
              </>
            )}
          </NavLink>
        )
      })}
      </div>
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
  const [avatarFailed, setAvatarFailed] = useState(false)
  const hiddenPath = ['/welcome', '/login', '/join', '/onboarding'].includes(location.pathname) || location.pathname.startsWith('/pre') || location.pathname.startsWith('/flow')
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
      const navH = nav?.getBoundingClientRect().height ?? 0
      const rootBox = root.getBoundingClientRect()
      const buttons = [...root.querySelectorAll('main button, main a')].filter((el) => el.getBoundingClientRect().height > 20)
      let above = navH + 16
      for (const button of buttons) {
        const box = button.getBoundingClientRect()
        if (box.top > rootBox.bottom || box.bottom < rootBox.bottom - 150) continue
        above = Math.max(above, rootBox.bottom - box.top + 16)
      }
      setTucked(false)
      setLift(Math.min(above, rootBox.height - 72))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    const main = root.querySelector('main')
    main?.addEventListener('scroll', measure, { passive: true })
    return () => {
      observer.disconnect()
      main?.removeEventListener('scroll', measure)
    }
  }, [location.pathname, app.helpOpen])
  if (hiddenPath || tucked || appTour || flowTour || scamOpen || hideReview || (app.helpOpen && app.helpView === 'ai')) return null
  const label = translate(app.prefs.language, 'help.askOllie')
  return (
    <button
      type="button"
      className="absolute right-3 z-30 flex items-center rounded-full text-white"
      style={{ bottom: 88, height: 48, width: 48, background: 'var(--accent)', boxShadow: '0 4px 14px rgba(0,0,0,0.28)' }}
      aria-label={label}
      onClick={() => {
        localStorage.setItem(OLLIE_LABEL_KEY, '1')
        setShowLabel(false)
        app.openHelp('ai')
      }}
    >
      {avatarFailed ? <span aria-hidden className="grid h-12 w-12 place-items-center text-lg font-bold">O</span> : <img src="/ollie-avatar.png" alt="" className="h-12 w-12 rounded-full object-cover" onError={() => setAvatarFailed(true)} />}
    </button>
  )
}

function HelpLayer() {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const aiFull = app.helpOpen && app.helpView === 'ai'
  const setNotice = app.setNotice
  const language = app.prefs.language
  useEffect(() => {
    setNotice('')
  }, [location.pathname, setNotice])

  useEffect(() => {
    if (!app.helpOpen) stopSpeaking()
  }, [app.helpOpen])
  useEffect(() => {
    const onCantonese = () => setNotice(translate(language, 'speech.cantoneseDown'))
    window.addEventListener('ocbc-cantonese', onCantonese)
    return () => window.removeEventListener('ocbc-cantonese', onCantonese)
  }, [language, setNotice])
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
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  return (
    <button
      type="button"
      className="flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full border border-[var(--muted)] p-0 text-base font-semibold text-[var(--text)]"
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
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
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
  const progress = loadTourProgress(app.profile.id)
  const practised = practisedJourneyCount(progress)
  const prompt = app.guidePrompt
  const flowLabel = ['paynow', 'transfer', 'overseas', 'bill', 'scan', 'giro', 'goal', 'card-lock', 'card-lost', 'limit'].includes(prompt.journeyId)
    ? t(`flows.${prompt.journeyId === 'card-lock' ? 'cardLock' : prompt.journeyId === 'card-lost' ? 'cardLost' : prompt.journeyId}`)
    : t('tours.guided')
  const nextId = prompt.practice ? nextPracticeJourney(app.prefs, progress, prompt.journeyId) : null
  return (
    <div ref={ref} className="mx-4 mt-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3">
      <p className="font-semibold">{prompt.practice ? t('tours.confidenceTitle', { flow: flowLabel }) : t('guideDone')}</p>
      {prompt.practice && (
        <p className="text-sm text-[var(--muted)]">{t('tours.confidenceBody', { done: practised, total: JOURNEY_TOUR_IDS.length })}</p>
      )}
      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          className="min-h-14 rounded-xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]"
          onClick={() => {
            if (prompt) sessionStorage.setItem('ocbc-guide-prompt', prompt.journeyId)
            app.setGuidePrompt(null)
            if (prompt?.practice) navigate(`/flow/${prompt.journeyId}`)
            else if (prompt) navigate(journeyRoute(prompt.journeyId))
          }}
        >
          {prompt.practice ? t('doForReal') : t('continue')}
        </button>
        {nextId && (
          <button
            type="button"
            className="min-h-14 rounded-xl border border-[var(--line)] font-semibold"
            onClick={() => {
              sessionStorage.setItem('ocbc-guide-prompt', prompt.journeyId)
              app.setGuidePrompt(null)
              navigate(`/flow/${nextId}?practice=1&tour=1`)
            }}
          >
            {t('tours.nextJourney')}
          </button>
        )}
        <button
          type="button"
          className="min-h-11 rounded-xl border border-[var(--line)] font-semibold"
          onClick={() => {
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
  tone = 'plain',
  onBack,
}: {
  title?: string
  children: React.ReactNode
  back?: boolean
  /** Header background: 'plain' (white, divider) or 'pink' (soft pink, no divider, as on OCBC flow screens). */
  tone?: 'plain' | 'pink'
  /** Optional in-page back step for multi-screen flows (used by PayNow); defaults to browser history back. */
  onBack?: () => void
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
    void speak(readableText(mainRef.current, title), { language: prefs.language, rate: prefs.speechRate, dialect: prefs.dialect }).finally(() => setSpeakingTitle(false))
  }, [location.pathname, title, prefs.readAloud, prefs.language, prefs.speechRate, prefs.dialect])
  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className={`grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1 px-2 py-2 ${tone === 'pink' ? 'bg-[var(--pink-soft)]' : 'border-b border-[var(--line)] bg-[var(--card)]'}`}>
        <span className="flex items-center">
          {back && (
            <button type="button" className="flex h-11 w-11 items-center justify-center" onClick={() => (onBack ? onBack() : navigate(-1))} aria-label={t('back')}>
              <ChevronLeft aria-hidden size={28} strokeWidth={1.5} />
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
                void speak(readableText(mainRef.current, title), { language: prefs.language, rate: prefs.speechRate, dialect: prefs.dialect }).finally(() => setSpeakingTitle(false))
              }}
            />
          )}
        </span>
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {title && <h1 className="line-clamp-2 min-w-0 whitespace-normal text-center text-[1.05rem] font-normal leading-snug">{title}</h1>}
          <span className="shrink-0"><DemoBadge /></span>
        </div>
        <span className="flex items-center justify-end">
          <ExplainButton />
        </span>
      </header>
      <main id="main" ref={mainRef} key={location.pathname} className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg)] ${location.pathname.startsWith('/flow') ? '' : 'nav-clearance'}`}>
        <GuideDone />
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
