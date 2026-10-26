import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Square, Volume2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'
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

  useEffect(() => {
    if (!state.active || !step) return
    const found = document.querySelector(`[data-guide="${step.element}"]`)
    document.querySelectorAll('.tour-target').forEach((node) => node.classList.remove('tour-target'))
    if (!found) {
      app.log('guide_step_missing', { guideId: 'app-tour', element: step.element, stepId: step.id })
    } else {
      found.classList.add('tour-target')
      found.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
    <div className="absolute inset-x-0 bottom-16 z-40 px-3">
      <div role="dialog" aria-labelledby="app-tour-title" className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 text-[var(--text)] shadow-lg">
        <div className="mb-2 flex gap-1" aria-hidden>
          {sections.map((section, index) => (
            <span key={section} className={`h-1 flex-1 rounded-full ${index <= currentSection ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`} title={t(section)} />
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">{sections.map((section) => t(section)).join(' · ')}</p>
        <h2 id="app-tour-title" className="mt-1 text-base font-semibold">{t(step.title)}</h2>
        <p className="text-sm leading-snug">{t(step.body)}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm tabular-nums">{state.index + 1} / {APP_TOUR.length}</span>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)]"
            aria-label={playing ? t('stop') : t('speech.readAloud')}
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
          >
            {playing ? <Square aria-hidden size={16} /> : <Volume2 aria-hidden size={20} />}
          </button>
          <button type="button" className="ml-auto px-2 text-sm font-semibold text-[var(--link)]" onClick={() => (state.index === 0 ? exit() : go(state.index - 1))}>
            {t('back')}
          </button>
          <button
            type="button"
            className="min-h-10 rounded-xl bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--on-accent)]"
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
          <button type="button" className="px-1 text-sm text-[var(--muted)]" onClick={exit} aria-label={t('close')}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
