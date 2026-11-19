import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { dismissNudge, peekNudge, type ActiveNudge } from '@/lib/adaptiveNudges'
import { patchForPreset } from '@/lib/presets'

export function AdaptiveNudge() {
  const app = useApp()
  const navigate = useNavigate()
  const t = (key: string) => translate(app.prefs.language, key)
  const [nudge, setNudge] = useState<ActiveNudge | null>(null)

  useEffect(() => {
    setNudge(peekNudge(app.profile.id, app.prefs))
  }, [app.profile.id, app.prefs, app.step, app.screen])

  if (!nudge) return null

  const close = () => {
    dismissNudge(app.profile.id, nudge.kind)
    setNudge(null)
  }

  const bodyKey =
    nudge.kind === 'showHow'
      ? 'nudge.showHow'
      : nudge.kind === 'biggerText'
        ? 'nudge.biggerText'
        : nudge.kind === 'easierTap'
          ? 'nudge.easierTap'
          : 'nudge.tourSuggest'

  const apply = () => {
    if (nudge.kind === 'biggerText') {
      app.updatePrefs(patchForPreset('easyReading'))
    } else if (nudge.kind === 'easierTap') {
      app.updatePrefs({ easierTapping: true })
    } else if (nudge.kind === 'showHow') {
      navigate('/help')
      app.openHelp('ai')
    } else if (nudge.tourId) {
      navigate(nudge.tourId === 'home' ? '/?tour=1' : nudge.tourId === 'settings' ? '/settings?tour=1' : nudge.tourId === 'insights' ? '/insights?tour=1' : `/flow/${nudge.tourId}?practice=1&tour=1`)
    }
    close()
  }

  return (
    <div className="mx-4 mt-2 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3 shadow-sm" role="status">
      <p className="text-sm font-semibold">{t(bodyKey)}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 flex-1 rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={apply}>
          {t('nudge.yes')}
        </button>
        <button type="button" className="min-h-11 flex-1 rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={close}>
          {t('nudge.dismiss')}
        </button>
      </div>
    </div>
  )
}