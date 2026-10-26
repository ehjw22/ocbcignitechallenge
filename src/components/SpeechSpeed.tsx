import { useState } from 'react'
import { useApp } from '@/context/AppContext'
import { SpeakButton } from '@/components/SpeakButton'
import { translate } from '@/i18n'
import { snapRate } from '@/lib/rates'
import { speak, stopSpeaking } from '@/lib/speech'

export function SpeechSpeed() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const current = snapRate(app.prefs.speechRate)
  const label = current === 1 ? '1x' : `${current.toFixed(1)}x`
  const [playing, setPlaying] = useState(false)

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
      <span className="mt-2 inline-flex">
      <SpeakButton
        playing={playing}
        listenLabel={t('playSample')}
        stopLabel={t('stop')}
        onClick={() => {
          if (playing) {
            stopSpeaking()
            setPlaying(false)
            return
          }
          setPlaying(true)
          void speak(t('speechSample'), {
            language: app.prefs.language,
            rate: current,
            dialect: app.prefs.dialect,
          }).finally(() => setPlaying(false))
        }}
      />
      </span>
    </div>
  )
}
