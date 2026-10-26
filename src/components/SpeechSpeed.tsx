import { Volume2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { snapRate } from '@/lib/rates'
import { speak } from '@/lib/speech'

export function SpeechSpeed() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const current = snapRate(app.prefs.speechRate)
  const label = current === 1 ? '1x' : `${current.toFixed(1)}x`

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold" id="speaking-speed">{t('speakingSpeed')}</p>
        <span className="tabular-nums font-semibold">{label}</span>
      </div>
      <div className="mt-1 flex justify-between text-sm text-[var(--muted)]">
        <span>{t('speech.slower')}</span>
        <span>{t('speech.faster')}</span>
      </div>
      <input
        aria-labelledby="speaking-speed"
        type="range"
        min={0.6}
        max={1.5}
        step={0.1}
        value={current}
        onChange={(event) => app.updatePrefs({ speechRate: snapRate(Number(event.target.value)) })}
        className="mt-1 w-full"
      />
      <button
        type="button"
        className="mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)]"
        aria-label={t('playSample')}
        onClick={() => {
          void speak(t('speechSample'), {
            language: app.prefs.language,
            rate: current,
            dialect: app.prefs.dialect,
          })
        }}
      >
        <Volume2 aria-hidden size={20} />
      </button>
    </div>
  )
}
