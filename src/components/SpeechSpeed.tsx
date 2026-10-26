import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { SPEECH_RATES, formatRate, rateKey, snapRate } from '@/lib/rates'
import { speak } from '@/lib/speech'

export function SpeechSpeed() {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  const current = snapRate(app.prefs.speechRate)

  return (
    <div className="mt-3">
      <p className="font-semibold" id="speaking-speed">{t('speakingSpeed')}</p>
      <div role="radiogroup" aria-labelledby="speaking-speed" className="mt-2 space-y-2">
        {SPEECH_RATES.map((rate) => (
          <button
            key={rate}
            type="button"
            role="radio"
            aria-checked={current === rate}
            className="flex min-h-12 w-full items-center rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 text-left font-semibold"
            onClick={() => app.updatePrefs({ speechRate: rate })}
          >
            {t(`speechRates.${rateKey(rate)}`)} {formatRate(rate)}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] font-semibold"
        onClick={() => {
          void speak(t('speechSample'), {
            language: app.prefs.language,
            rate: current,
            dialect: app.prefs.dialect,
          })
        }}
      >
        {t('playSample')}
      </button>
    </div>
  )
}
