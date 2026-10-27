import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useApp } from '@/context/AppContext'
import { SpeakButton } from '@/components/SpeakButton'
import { translate } from '@/i18n'
import { getFlowTour, moveFlowTour, subscribeFlowTour } from '@/lib/guide'
import { prefetchSpeech, stopSpeaking } from '@/lib/speech'

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
  autoSpeak,
  speak,
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
  autoSpeak: boolean
  speak: (text: string) => void | Promise<unknown>
}) {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const cardRef = useRef<HTMLDivElement>(null)
  const speakRef = useRef(speak)
  speakRef.current = speak
  const [playing, setPlaying] = useState(false)
  const [hole, setHole] = useState<Box | null>(null)
  const [top, setTop] = useState(12)

  useEffect(() => {
    if (!active) return
    prefetchSpeech(`${title}. ${body}`, {
      language: app.prefs.language,
      rate: app.prefs.speechRate,
      dialect: app.prefs.dialect,
    })
  }, [active, title, body, app.prefs.language, app.prefs.speechRate, app.prefs.dialect])

  useEffect(() => {
    if (!active || !autoSpeak) return
    setPlaying(true)
    let live = true
    void Promise.resolve(speakRef.current(`${title}. ${body}`)).finally(() => {
      if (live) setPlaying(false)
    })
    return () => {
      live = false
      stopSpeaking()
      setPlaying(false)
    }
  }, [active, autoSpeak, element, title, body])

  useLayoutEffect(() => {
    if (!active) return
    const root = document.getElementById('customer-root')
    if (!root) return
    const mains = [...root.querySelectorAll('main')] as HTMLElement[]
    const previous = mains.map((node) => node.style.overflow)
    const target = element ? document.querySelector(`[data-guide="${CSS.escape(element)}"]`) : null
    if (target) {
      const scroller = target.closest('main') as HTMLElement | null
      if (scroller) {
        const frame = scroller.getBoundingClientRect()
        const box = target.getBoundingClientRect()
        const pad = 16
        if (box.top < frame.top + pad || box.bottom > frame.bottom - pad) {
          scroller.scrollTop += box.top - frame.top - Math.max(pad, (frame.height - box.height) / 2)
        }
      }
    }
    mains.forEach((node) => {
      node.style.overflow = 'hidden'
    })
    const block = (event: Event) => {
      const card = (event.target as HTMLElement | null)?.closest?.('[data-tour-card]')
      if (card && card.scrollHeight > card.clientHeight + 2) return
      event.preventDefault()
    }
    const keys = (event: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return
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
        const pad = 6
        const radius = Number.parseFloat(getComputedStyle(found).borderRadius) || 12
        holeBox = {
          top: (rect.top - rootBox.top) / scale - pad,
          left: (rect.left - rootBox.left) / scale - pad,
          width: rect.width / scale + pad * 2,
          height: rect.height / scale + pad * 2,
          radius: radius + pad,
        }
      }
      card.style.maxHeight = ''
      const gap = 12
      const cardH = card.offsetHeight
      const limit = root.clientHeight - gap
      let nextTop = Math.max(gap, limit - cardH)
      if (holeBox) {
        const maxHole = Math.max(88, limit - cardH - gap * 2)
        if (holeBox.height > maxHole) holeBox.height = maxHole
        const spaceBelow = limit - (holeBox.top + holeBox.height)
        const spaceAbove = holeBox.top - gap
        const below = spaceBelow >= cardH || spaceBelow >= spaceAbove
        const room = Math.max(96, (below ? spaceBelow : spaceAbove) - gap)
        if (card.scrollHeight > room) card.style.maxHeight = `${room}px`
        const used = card.offsetHeight
        nextTop = below ? holeBox.top + holeBox.height + gap : Math.max(gap, holeBox.top - used - gap)
        const holeBottom = holeBox.top + holeBox.height
        if (nextTop < holeBottom && nextTop + used > holeBox.top) {
          nextTop = holeBottom + gap
        }
      }
      setHole(holeBox)
      setTop(nextTop)
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(root)
    if (target) observer.observe(target)
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
      stopSpeaking()
    }
  }, [active, element, title, body, step])

  if (!active) return null
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
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            outline: '2px solid var(--accent)',
            outlineOffset: 0,
          }}
        />
      )}
      <div className="absolute z-40 px-3" style={{ left: 0, right: 0, top }} data-tour-card>
        <div
          ref={cardRef}
          role="dialog"
          aria-labelledby="tour-title"
          className="overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 text-[var(--text)] shadow-lg"
        >
          <div className="flex items-start gap-2">
            <h2 id="tour-title" className="min-w-0 flex-1 text-[1.05rem] font-semibold leading-snug">{title}</h2>
            <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none" aria-label={t('close')} onClick={onClose}>
              ×
            </button>
          </div>
          <p className="mt-1 text-[1rem] leading-snug">{body}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
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
                  void Promise.resolve(speak(`${title}. ${body}`)).finally(() => setPlaying(false))
                }}
              />
              <span className="text-sm tabular-nums">{step} / {total}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="h-11 shrink-0 rounded-xl border border-[var(--line)] bg-[var(--soft)] px-3 font-semibold disabled:opacity-40"
                disabled={step <= 1}
                onClick={onBack}
              >
                {t('back')}
              </button>
              <button type="button" className="h-11 shrink-0 rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={onNext}>
                {nextLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function FlowTour() {
  const tour = useSyncExternalStore(subscribeFlowTour, getFlowTour, getFlowTour)
  const app = useApp()
  if (!tour) return null
  const current = tour.steps[tour.index]
  if (!current) return null
  const t = (key: string) => translate(app.prefs.language, key)
  const last = tour.index >= tour.steps.length - 1
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
      autoSpeak={app.prefs.readAloud}
      speak={(text) => tour.speak(text)}
    />
  )
}
