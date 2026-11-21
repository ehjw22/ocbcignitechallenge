import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { SpeakButton } from '@/components/SpeakButton'
import { translate } from '@/i18n'
import { getFlowTour, moveFlowTour, subscribeFlowTour } from '@/lib/guide'
import { prefetchSpeech, speak as speakText, stopSpeaking } from '@/lib/speech'
import { loadTourPace, saveTourPace, tourHighlightPad, tourSpeakDelayMs, tourSpeechRate, type TourPace } from '@/lib/tourPace'
import { collapseOpened, prepareTarget } from '@/lib/tourPlace'

type Box = { top: number; left: number; width: number; height: number; radius: number }

export function TourFrame({
  active,
  element,
  title,
  body,
  step,
  total,
  nextLabel,
  onBack,
  onNext,
  onClose,
  onSkip,
  autoSpeak,
  nextTitle,
  nextBody,
  flowEnd,
}: {
  active: boolean
  element?: string
  title: string
  body: string
  step: number
  total: number
  nextLabel: string
  onBack: () => void
  onNext: () => void
  onClose: () => void
  onSkip?: () => void
  autoSpeak: boolean
  nextTitle?: string
  nextBody?: string
  flowEnd?: { onPractise: () => void; onReal: () => void; onDone: () => void }
}) {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const cardRef = useRef<HTMLDivElement>(null)
  const [pace, setPace] = useState<TourPace>(loadTourPace)
  const speechOpts = () => ({
    language: app.prefs.language,
    rate: tourSpeechRate(app.prefs.speechRate, pace),
    dialect: app.prefs.dialect,
  })
  const pacedSpeak = (text: string) => speakText(text, speechOpts())
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const [playing, setPlaying] = useState(false)
  const [hole, setHole] = useState<Box | null>(null)
  const [top, setTop] = useState(12)
  const [ready, setReady] = useState(false)
  const skipRef = useRef(onSkip)
  skipRef.current = onSkip

  useEffect(() => {
    if (!active) return
    const opts = speechOpts()
    prefetchSpeech(`${title}. ${body}`, opts)
    if (nextTitle && nextBody) prefetchSpeech(`${nextTitle}. ${nextBody}`, opts)
  }, [active, title, body, nextTitle, nextBody, app.prefs.language, app.prefs.speechRate, app.prefs.dialect, pace])

  useEffect(() => {
    if (!active || !autoSpeak) return
  const delay = tourSpeakDelayMs(pace)
    let live = true
    const timer = window.setTimeout(() => {
      if (!live) return
      setPlaying(true)
      void pacedSpeak(`${title}. ${body}`).finally(() => {
        if (live) setPlaying(false)
      })
    }, delay)
    return () => {
      live = false
      window.clearTimeout(timer)
      stopSpeaking()
      setPlaying(false)
    }
  }, [active, autoSpeak, element, title, body, pace])

  useEffect(() => {
    if (!active || !element) return
    let live = true
    setReady(false)
    setHole(null)
    void prepareTarget(element).then((found) => {
      if (!live) return
      if (!found) {
        setReady(true)
        return
      }
      setReady(true)
    })
    return () => {
      live = false
    }
  }, [active, element, step])

  useLayoutEffect(() => {
    if (!active || !ready) return
    const root = document.getElementById('customer-root')
    if (!root) return
    const mains = [...root.querySelectorAll('main')] as HTMLElement[]
    const previous = mains.map((node) => node.style.overflow)
    const target = element ? document.querySelector(`[data-guide="${CSS.escape(element)}"]`) : null
    mains.forEach((node) => {
      node.style.overflow = 'hidden'
    })
    const block = (event: Event) => {
      const card = (event.target as HTMLElement | null)?.closest?.('[data-tour-card]')
      if (card) return
      event.preventDefault()
    }
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return
      if ((event.target as HTMLElement | null)?.closest?.('[data-tour-card]')) return
      event.preventDefault()
    }
    root.addEventListener('wheel', block, { passive: false })
    root.addEventListener('touchmove', block, { passive: false })
    window.addEventListener('keydown', keys)
    const place = () => {
      const card = cardRef.current
      if (!card) return
      const scale = root.getBoundingClientRect().width / root.offsetWidth || 1
      const rootBox = root.getBoundingClientRect()
      const found = element ? document.querySelector(`[data-guide="${CSS.escape(element)}"]`) : null
      let holeBox: Box | null = null
      if (found) {
        const rect = found.getBoundingClientRect()
        if (rect.height < 2) {
          const toggle = found.closest('section')?.querySelector('button[aria-expanded]')
          if (toggle instanceof HTMLButtonElement && toggle.getAttribute('aria-expanded') !== 'true') toggle.click()
        }
        const pad = tourHighlightPad(pace)
        const radius = Number.parseFloat(getComputedStyle(found).borderRadius) || 12
        const rawLeft = (rect.left - rootBox.left) / scale - pad
        const rawWidth = rect.width / scale + pad * 2
        const left = Math.max(0, rawLeft)
        const width = Math.min(root.offsetWidth - left, rawWidth - (left - rawLeft))
        holeBox = {
          top: (rect.top - rootBox.top) / scale - pad,
          left,
          width: Math.max(8, width),
          height: rect.height / scale + pad * 2,
          radius: radius + pad,
        }
      }
      const minTop = 8
      const navTop = root.querySelector('nav')?.getBoundingClientRect()
      const floor = Math.min((navTop ? (navTop.top - rootBox.top) / scale : root.clientHeight) - 8, root.clientHeight - 8)
      if (found instanceof HTMLElement && found.getBoundingClientRect().height > (floor - minTop) * 0.55) {
        const main = found.closest('main')
        if (main) {
          const box = found.getBoundingClientRect()
          const headerBottom = root.querySelector('header')?.getBoundingClientRect().bottom ?? rootBox.top
          main.scrollTop += box.top - headerBottom - 12
          const next = found.getBoundingClientRect()
          if (holeBox) {
            holeBox.top = (next.top - rootBox.top) / scale - 6
            holeBox.height = next.height / scale + 12
          }
        }
      }
      const band = Math.max(160, floor - minTop)
      const cap = Math.max(140, Math.round(band * 0.45))
      card.style.maxHeight = `${cap}px`
      const used = Math.min(card.scrollHeight, cap)
      const mid = minTop + band / 2
      let nextTop = minTop
      if (holeBox) {
        const holeMid = holeBox.top + holeBox.height / 2
        const placeBelow = holeMid < mid
        if (found instanceof HTMLElement) {
          const main = found.closest('main')
          if (main) {
            const box = found.getBoundingClientRect()
            const headerBottom = root.querySelector('header')?.getBoundingClientRect().bottom ?? rootBox.top
            const targetTop = placeBelow ? headerBottom + 8 : headerBottom + cap + 16
            main.scrollTop += box.top - targetTop
            const next = found.getBoundingClientRect()
            holeBox.top = (next.top - rootBox.top) / scale - 6
            holeBox.height = next.height / scale + 12
          }
        }
        nextTop = placeBelow ? Math.min(floor - used, holeBox.top + holeBox.height + 12) : Math.max(minTop, holeBox.top - used - 12)
        const holeBottom = holeBox.top + holeBox.height
        if (nextTop < holeBottom && nextTop + used > holeBox.top) {
          nextTop = placeBelow ? holeBottom + 12 : holeBox.top - used - 12
        }
      } else nextTop = floor - used
      if (nextTop < minTop) nextTop = minTop
      if (nextTop + used > floor) nextTop = Math.max(minTop, floor - used)
      setHole(holeBox)
      setTop(nextTop)
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(root)
    if (target) observer.observe(target)
    if (cardRef.current) observer.observe(cardRef.current)
    window.addEventListener('resize', place)
    return () => {
      mains.forEach((node, index) => {
        node.style.overflow = previous[index]
      })
      root.removeEventListener('wheel', block)
      root.removeEventListener('touchmove', block)
      window.removeEventListener('keydown', keys)
      window.removeEventListener('resize', place)
      observer.disconnect()
      collapseOpened()
      stopSpeaking()
    }
  }, [active, ready, element, title, body, step, pace])

  if (!active || !ready) return null
  return (
    <>
      {hole && (
        <div
          className="pointer-events-none absolute z-30"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            borderRadius: hole.radius,
            boxShadow: '0 0 0 9999px rgba(40,48,54,0.55)',
            outline: '2px solid #fff',
          }}
        />
      )}
      <div className="absolute z-40 px-3" style={{ left: 0, right: 0, top }} data-tour-card>
        <div
          ref={cardRef}
          role="dialog"
          aria-labelledby="tour-title"
          className={`flex max-h-[45%] flex-col overflow-hidden rounded-md bg-[#2A3B43] text-white shadow-lg ${app.prefs.textSize >= 22 ? 'p-3 text-[16px]' : 'p-5'}`}
        >
          <p className="mb-2 text-[13px]" aria-live="polite">{translate(app.prefs.language, 'practice.step', { n: step, total })}</p>
          <div className="mb-3 flex gap-1" aria-hidden>
            {Array.from({ length: total }, (_, index) => (
              <span key={index} className={`h-1 flex-1 rounded-full ${index < step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <h2 id="tour-title" className={`min-w-0 flex-1 font-semibold leading-snug ${app.prefs.textSize >= 22 ? 'text-[18px]' : 'text-[1.15rem]'}`}>{title}</h2>
            <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl leading-none text-white" aria-label={t('close')} onClick={onClose}>
              ×
            </button>
          </div>
          <p
            className={`mt-1 min-h-0 flex-1 overflow-y-auto leading-snug ${app.prefs.textSize >= 22 ? 'text-[16px]' : 'text-[1rem]'}`}
            onClick={() => {
              if (!app.prefs.readAloud) return
              setPlaying(true)
              void pacedSpeak(`${title}. ${flowEnd ? t('flows.tourEndBody') : body}`).finally(() => setPlaying(false))
            }}
          >
            {flowEnd ? t('flows.tourEndBody') : body}
          </p>
          <div className="mt-2 flex gap-2" role="group" aria-label={t('tours.pace')}>
            {(['normal', 'slow'] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`min-h-9 flex-1 rounded-lg px-2 text-sm font-semibold ${pace === item ? 'bg-white text-[#2A3B43]' : 'border border-white/40 text-white'}`}
                aria-pressed={pace === item}
                onClick={() => {
                  setPace(item)
                  saveTourPace(item)
                }}
              >
                {t(item === 'slow' ? 'tours.paceSlow' : 'tours.paceNormal')}
              </button>
            ))}
          </div>
          {flowEnd ? (
            <div className="mt-3 flex shrink-0 flex-col gap-2">
              <div className="flex items-center gap-2">
                <SpeakButton
                  playing={playing}
                  listenLabel={t('speech.readAloud')}
                  stopLabel={t('stop')}
                  onClick={() => {
                    if (playing) {
                      stopSpeaking()
                      setPlaying(false)
                      return
                    }
                    setPlaying(true)
                    void pacedSpeak(`${translate(app.prefs.language, 'practice.step', { n: step, total })}. ${title}. ${t('flows.tourEndBody')}`).finally(() => setPlaying(false))
                  }}
                />
                {step > 1 && (
                  <button type="button" className="min-h-11 px-3 font-semibold text-white underline" onClick={onBack}>{t('back')}</button>
                )}
              </div>
              <button type="button" className="min-h-11 w-full rounded-lg bg-white px-3 font-bold text-[#2A3B43]" onClick={flowEnd.onPractise}>{t('flows.practiseThis')}</button>
              <button type="button" className="min-h-11 w-full rounded-lg border border-white/80 bg-transparent px-3 font-semibold text-white" onClick={flowEnd.onReal}>{t('doForReal')}</button>
              <button type="button" className="min-h-11 w-full rounded-lg border border-white/50 bg-transparent px-3 font-semibold text-white underline" onClick={flowEnd.onDone}>{t('done')}</button>
            </div>
          ) : (
          <div className="mt-3 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <SpeakButton
                playing={playing}
                listenLabel={t('speech.readAloud')}
                stopLabel={t('stop')}
                onClick={() => {
                  if (playing) {
                    stopSpeaking()
                    setPlaying(false)
                    return
                  }
                  setPlaying(true)
                  void pacedSpeak(`${translate(app.prefs.language, 'practice.step', { n: step, total })}. ${title}. ${body}`).finally(() => setPlaying(false))
                }}
              />
              <span className="sr-only" aria-live="polite">{translate(app.prefs.language, 'practice.step', { n: step, total })}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center bg-transparent px-3 font-semibold text-white underline disabled:opacity-40"
                disabled={step <= 1}
                onClick={onBack}
              >
                {t('back')}
              </button>
              <button type="button" className="inline-flex min-h-11 min-w-11 items-center justify-center bg-transparent px-3 font-semibold text-white underline" onClick={onNext}>
                {nextLabel}
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </>
  )
}

const GUIDE_FLOW: Record<string, string> = {
  paynow: 'paynow',
  transfer: 'transfer',
  overseas: 'overseas',
  bill: 'bill',
  giro: 'giro',
  goal: 'goal',
  'card-lock': 'card-lock',
  limit: 'limit',
  scan: 'scan',
}

export function FlowTour() {
  const tour = useSyncExternalStore(subscribeFlowTour, getFlowTour, getFlowTour)
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  // A guided tour belongs to the screen it started on. If the user leaves that screen (back arrow, bottom nav, …),
  // end the tour so its card and narration don't carry on over the next screen.
  const startedOn = useRef<{ guideId: string; path: string } | null>(null)
  const guideId = tour?.guideId || ''
  useEffect(() => {
    if (!guideId) {
      startedOn.current = null
      return
    }
    if (startedOn.current?.guideId !== guideId) {
      startedOn.current = { guideId, path: location.pathname }
      return
    }
    if (startedOn.current.path !== location.pathname) moveFlowTour(-1)
  }, [guideId, location.pathname])
  if (!tour) return null
  const current = tour.steps[tour.index]
  if (!current) return null
  const t = (key: string) => translate(app.prefs.language, key)
  const last = tour.index >= tour.steps.length - 1
  const flowId = GUIDE_FLOW[tour.guideId] || tour.guideId
  const flowTourEnd = Boolean(GUIDE_FLOW[tour.guideId])
  return (
    <TourFrame
      active
      element={current.element}
      title={t(current.title)}
      body={t(current.body)}
      step={tour.index + 1}
      total={tour.steps.length}
      nextLabel={last ? t('done') : t('next')}
      onBack={() => moveFlowTour(tour.index - 1)}
      onNext={() => moveFlowTour(last ? tour.steps.length : tour.index + 1)}
      onClose={() => moveFlowTour(-1)}
      onSkip={() => moveFlowTour(tour.index + 1 >= tour.steps.length ? -1 : tour.index + 1)}
      autoSpeak={app.prefs.readAloud}
      nextTitle={!last ? t(tour.steps[tour.index + 1].title) : undefined}
      nextBody={!last ? t(tour.steps[tour.index + 1].body) : undefined}
      flowEnd={last && flowTourEnd ? {
        onPractise: () => { moveFlowTour(-1); navigate(`/flow/${flowId}?practice=1`) },
        onReal: () => { moveFlowTour(-1); navigate(`/flow/${flowId}`, { replace: true }) },
        onDone: () => moveFlowTour(tour.steps.length),
      } : undefined}
    />
  )
}
