import { translate } from '@/i18n'
import { startGuide } from '@/lib/guide'
import { formatRate, nextRate } from '@/lib/rates'
import { speak } from '@/lib/speech'
import type { useApp } from '@/context/AppContext'

type App = ReturnType<typeof useApp>

export function playGuide(app: App, guideId: string) {
  return startGuide({
    guideId,
    text: (key) => translate(app.prefs.language, key),
    readAloud: app.prefs.readAloud,
    rate: () => app.prefs.speechRate,
    setRate: (rate) => app.updatePrefs({ speechRate: rate }),
    formatRate,
    nextRate,
    speak: (text, onRange) => {
      void speak(text, {
        language: app.prefs.language,
        rate: app.prefs.speechRate,
        dialect: app.prefs.dialect,
        onRange,
      })
    },
    onMissing: (element, stepId) => {
      app.log('guide_step_missing', { guideId, element, stepId })
      app.setNotice(translate(app.prefs.language, 'guideSkipped'))
      app.setAnnounce(translate(app.prefs.language, 'guideSkipped'))
    },
    onStart: () => app.log('guide_started', { guideId }),
    onStep: (stepId) => app.setGuideStep(`${guideId}:${stepId}`),
    onDrop: (_guideId, stepId) => app.log('guide_dropped', { guideId, stepId }),
    onDone: () => app.log('guide_completed', { guideId }),
  })
}
