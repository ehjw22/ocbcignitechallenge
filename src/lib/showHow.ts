import journeys from '@/guides/journeys.json'
import { formatRate, nextRate } from '@/lib/rates'
import { getFlowTour, guideById, startGuide } from '@/lib/guide'
import { markTourDropped, markTourFinished, markTourOpened, markTourStep } from '@/lib/tourTracking'
import { speak } from '@/lib/speech'
import type { Preferences } from '@/lib/types'
import type { useApp } from '@/context/AppContext'

type App = ReturnType<typeof useApp>

const KEY = 'ocbc-show-how'

export function journeyRoute(id: string) {
  return (journeys as Record<string, { route: string }>)[id]?.route || '/'
}

export function queueShowHow(journeyId: string, practice: boolean) {
  sessionStorage.setItem(KEY, JSON.stringify({ journeyId, practice }))
}

export function peekShowHow(pageId: string) {
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return false
  try {
    const job = JSON.parse(raw) as { journeyId?: string }
    const route = journeyRoute(job.journeyId || '')
    const page = route === '/settings' ? 'settings' : route.split('/').pop()
    return page === pageId
  } catch {
    return false
  }
}

export function takeShowHow(pageId: string) {
  const raw = sessionStorage.getItem(KEY)
  if (!raw) return null
  let job: { journeyId: string; practice: boolean }
  try {
    job = JSON.parse(raw) as { journeyId: string; practice: boolean }
  } catch {
    sessionStorage.removeItem(KEY)
    return null
  }
  const route = journeyRoute(job.journeyId)
  const page = route === '/settings' ? 'settings' : route.split('/').pop()
  if (page !== pageId) return null
  sessionStorage.removeItem(KEY)
  return job
}

export function beginShowHow(app: App, getPrefs: () => Preferences, journeyId: string, practice: boolean, text: (key: string) => string) {
  return startGuide({
    guideId: journeyId,
    text,
    readAloud: getPrefs().readAloud,
    waitForTap: true,
    rate: () => getPrefs().speechRate,
    setRate: (rate) => app.updatePrefs({ speechRate: rate }),
    formatRate,
    nextRate,
    speak: (spoken, onRange) => {
      const prefs = getPrefs()
      return speak(spoken, {
        language: prefs.language,
        rate: prefs.speechRate,
        dialect: prefs.dialect,
        onRange,
      })
    },
    onMissing: (element, stepId) => {
      app.log('guide_step_missing', { guideId: journeyId, element, stepId })
      app.setNotice('')
    },
    onStart: (guideId) => {
      const total = guideById(guideId)?.steps.length || 0
      if (total) markTourOpened(app.profile.id, guideId, total)
      app.log('guide_started', { guideId, practice })
    },
    onStep: (stepId) => {
      app.setGuideStep(`${journeyId}:${stepId}`)
      const tour = getFlowTour()
      if (tour && tour.guideId === journeyId) markTourStep(app.profile.id, journeyId, tour.index, tour.steps.length)
    },
    onDrop: (guideId, stepId) => {
      const tour = getFlowTour()
      if (tour && tour.guideId === guideId) markTourDropped(app.profile.id, guideId, tour.index, tour.steps.length)
      app.log('guide_dropped', { guideId, stepId, practice })
    },
    onDone: (guideId) => {
      markTourFinished(app.profile.id, guideId, practice)
      app.log('guide_completed', { guideId, practice })
      if (practice) app.setGuidePrompt({ journeyId, practice })
    },
  })
}
