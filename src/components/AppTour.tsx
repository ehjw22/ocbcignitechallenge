import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { SpeakButton } from '@/components/SpeakButton'
import { translate } from '@/i18n'
import { APP_TOUR, tourSections, tourState, writeTour } from '@/lib/appTour'
import { speak, stopSpeaking } from '@/lib/speech'

export function AppTour() {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const t = (key: string) => translate(app.prefs.language, key)
  const [state, setState] = useState(tourState)
  const [playing, setPlaying] = useState(false)
  const [top, setTop] = useState<number | null>(null)
  const [hole, setHole] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [placed, setPlaced] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sync = () => setState(tourState())
    window.addEventListener('ocbc-tour', sync)
    return () => window.removeEventListener('ocbc-tour', sync)
  }, [])

  const step = APP_TOUR[state.index]
  useEffect(() => {
    if (!state.active || !step) return
    if (location.pathname !== step.route) navigate(step.route)
  }, [state.active, state.index, step, location.pathname, navigate])

  useLayoutEffect(() => {
    if (!state.active || !step) return
    const root = document.getElementById('customer-root')
    const card = cardRef.current
    if (!root || !card) return
    const target = document.querySelector(`[data-guide="${step.element}"]`)
    if (target) {
      const rect = target.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) {
        const toggle = target.closest('section')?.querySelector('button[aria-expanded]')
        if (toggle instanceof HTMLButtonElement && toggle.getAttribute('aria-expanded') !== 'true') {
          toggle.click()
          window.setTimeout(() => setPlaced((value) => value + 1), 50)
          return
        }
      }
      target.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
    const rootRect = root.getBoundingClientRect()
    const scale = rootRect.height / root.offsetHeight || 1
    const cardH = card.offsetHeight
    const nav = 76
    const pad = 12
    const notch = 36
    const dock = Math.max(notch, root.clientHeight - nav - cardH - pad)
    const place = (holeTop: number, holeH: number) => {
      const below = holeTop + holeH + pad
      const above = holeTop - cardH - pad
      if (below + cardH <= root.clientHeight - nav) return below
      if (above >= notch) return above
      return dock
    }
    if (target) {
      const measure = () => {
        const rect = target.getBoundingClientRect()
        const holeH = Math.min(Math.max(rect.height / scale, 44), 160)
        const rawTop = (rect.top - rootRect.top) / scale
        const holeTop = Math.max(notch, Math.min(rawTop, root.clientHeight - nav - holeH))
        return { holeH, holeTop, left: (rect.left - rootRect.left) / scale, width: rect.width / scale }
      }
      let box = measure()
      let next = place(box.holeTop, box.holeH)
      const hits = (value: number, holeTop: number, holeH: number) => value < holeTop + holeH + 4 && value + cardH > holeTop - 4
      if (hits(next, box.holeTop, box.holeH)) {
        target.scrollIntoView({ block: 'start', behavior: 'auto' })
        box = measure()
        next = place(box.holeTop, box.holeH)
        if (hits(next, box.holeTop, box.holeH)) next = dock
      }
      setHole({
        top: box.holeTop,
        left: Math.max(8, box.left),
        width: Math.min(box.width, root.clientWidth - 16),
        height: box.holeH,
      })
      setTop(next)
    } else {
      setHole(null)
      setTop(dock)
    }
  }, [state.active, state.index, step, location.pathname, placed])

  useEffect(() => {
    if (!state.active || !step) return
    const found = document.querySelector(`[data-guide="${step.element}"]`)
    document.querySelectorAll('.tour-target').forEach((node) => node.classList.remove('tour-target'))
    if (!found) {
      app.log('guide_step_missing', { guideId: 'app-tour', element: step.element, stepId: step.id })
    } else {
      found.classList.add('tour-target')
      found.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
    if (app.prefs.readAloud) {
      setPlaying(true)
      void speak(`${t(step.title)}. ${t(step.body)}`, {
        language: app.prefs.language,
        rate: app.prefs.speechRate,
        dialect: app.prefs.dialect,
      }).finally(() => setPlaying(false))
    }
    return () => {
      document.querySelectorAll('.tour-target').forEach((node) => node.classList.remove('tour-target'))
    }
    // Speak once per step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.index, location.pathname])

  if (!state.active || !step) return null
  const sections = tourSections()
  const currentSection = sections.indexOf(step.section)

  const go = (index: number) => {
    stopSpeaking()
    setPlaying(false)
    writeTour({ active: true, index })
    setState({ active: true, index })
  }

  const exit = () => {
    stopSpeaking()
    setPlaying(false)
    writeTour({ active: false, index: state.index })
    setState({ active: false, index: state.index })
    app.log('guide_dropped', { guideId: 'app-tour', stepId: step.id })
  }

  return (
    <>
    {hole && (
      <div
        className="pointer-events-none absolute z-30 rounded-xl"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
          outline: '2px solid var(--accent)',
          outlineOffset: '-2px',
        }}
      />
    )}
    <div className="absolute z-40" style={top == null ? { left: 12, right: 12, bottom: 76 } : { left: 12, right: 12, top }}>
      <div ref={cardRef} role="dialog" aria-labelledby="app-tour-title" className="max-w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 text-[var(--text)] shadow-lg">
        <div className="mb-2 flex gap-1" aria-hidden>
          {sections.map((section, index) => (
            <span key={section} className={`h-1 flex-1 rounded-full ${index <= currentSection ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`} title={t(section)} />
          ))}
        </div>
        <p className="text-[1rem] font-semibold text-[var(--muted)]">{t(step.section)}</p>
        <h2 id="app-tour-title" className="mt-1 text-[1.05rem] font-semibold">{t(step.title)}</h2>
        <p className="text-[1rem] leading-snug">{t(step.body)}</p>
        <div className="mt-2 grid h-11 grid-cols-[40px_3.25rem_minmax(0,1fr)_5.5rem_5.5rem_auto] items-center gap-1">
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
              void speak(`${t(step.title)}. ${t(step.body)}`, {
                language: app.prefs.language,
                rate: app.prefs.speechRate,
                dialect: app.prefs.dialect,
              }).finally(() => setPlaying(false))
            }}
          />
          <span className="text-sm tabular-nums">{state.index + 1} / {APP_TOUR.length}</span>
          <button type="button" className="h-11 w-[5.5rem] whitespace-nowrap text-center text-[1rem] font-semibold text-[var(--link)]" onClick={() => (state.index === 0 ? exit() : go(state.index - 1))}>
            {t('back')}
          </button>
          <button
            type="button"
            className="h-11 w-[5.5rem] whitespace-nowrap rounded-xl bg-[var(--accent)] text-center text-[1rem] font-semibold text-[var(--on-accent)]"
            onClick={() => {
              if (state.index >= APP_TOUR.length - 1) {
                stopSpeaking()
                writeTour({ active: false, index: 0 })
                setState({ active: false, index: 0 })
                app.log('guide_completed', { guideId: 'app-tour' })
                return
              }
              go(state.index + 1)
            }}
          >
            {state.index >= APP_TOUR.length - 1 ? t('done') : t('next')}
          </button>
          <button type="button" className="h-11 whitespace-nowrap px-1 text-sm text-[var(--muted)]" onClick={exit} aria-label={t('close')}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
