import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { TourFrame } from '@/components/TourFrame'
import { translate } from '@/i18n'
import { APP_TOUR, tourState, writeTour } from '@/lib/appTour'
import { stopSpeaking } from '@/lib/speech'
import { markTourDropped, markTourFinished, markTourOpened, markTourStep } from '@/lib/tourTracking'
import { collapseOpened } from '@/lib/tourPlace'

export function AppTour() {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const t = (key: string) => translate(app.prefs.language, key)
  const [state, setState] = useState(tourState)

  useEffect(() => {
    const sync = () => setState(tourState())
    window.addEventListener('ocbc-tour', sync)
    return () => window.removeEventListener('ocbc-tour', sync)
  }, [])

  useEffect(() => {
    if (!state.active) return
    markTourOpened(app.profile.id, 'app-tour', APP_TOUR.length)
    markTourStep(app.profile.id, 'app-tour', state.index, APP_TOUR.length)
  }, [state.active, state.index, app.profile.id])

  const step = APP_TOUR[state.index]
  useEffect(() => {
    if (!state.active || !step) return
    if (location.pathname !== step.route) navigate(step.route)
  }, [state.active, state.index, step, location.pathname, navigate])

  if (!state.active || !step) return null
  const last = state.index >= APP_TOUR.length - 1
  const go = (index: number) => {
    stopSpeaking()
    writeTour({ active: true, index })
    setState({ active: true, index })
  }
  const exit = () => {
    stopSpeaking()
    collapseOpened()
    writeTour({ active: false, index: state.index })
    setState({ active: false, index: state.index })
    markTourDropped(app.profile.id, 'app-tour', state.index, APP_TOUR.length)
    app.log('guide_dropped', { guideId: 'app-tour', stepId: step.id })
    if (location.search.includes('tour=1')) navigate(location.pathname, { replace: true })
  }

  return (
    <TourFrame
      active={location.pathname === step.route}
      element={step.element}
      title={t(step.title)}
      body={t(step.body)}
      step={state.index + 1}
      total={APP_TOUR.length}
      nextLabel={last ? t('done') : t('next')}
      onBack={() => go(state.index - 1)}
      onNext={() => {
        if (last) {
          stopSpeaking()
          writeTour({ active: false, index: 0 })
          setState({ active: false, index: 0 })
          markTourFinished(app.profile.id, 'app-tour', false)
          app.log('guide_completed', { guideId: 'app-tour' })
          return
        }
        go(state.index + 1)
      }}
      onClose={exit}
      onSkip={() => {
        if (last) exit()
        else go(state.index + 1)
      }}
      autoSpeak={app.prefs.readAloud}
      nextTitle={!last ? t(APP_TOUR[state.index + 1].title) : undefined}
      nextBody={!last ? t(APP_TOUR[state.index + 1].body) : undefined}
    />
  )
}
