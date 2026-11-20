import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { BottomNav, DemoBadge } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { VoiceLimitChoices } from '@/components/VoiceLimitChoices'
import { LanguagePicker } from '@/components/LanguagePicker'
import type { ColourVision, DetailLevel, HelpPreference } from '@/lib/types'

const STEPS = 6

export function Onboarding() {
  const { prefs, updatePrefs, profile } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const t = (key: string, vars?: Record<string, string | number>) => translate(prefs.language, key, vars)
  useEffect(() => {
    document.getElementById('main')?.scrollTo(0, 0)
  }, [step])
  const finish = (tour: boolean) => {
    updatePrefs({ onboarded: true })
    navigate(tour ? '/?tour=1' : '/')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
    <header className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-2">
      <DemoBadge />
      <button type="button" className="tap h-auto shrink-0 whitespace-normal rounded-full px-3 text-sm font-semibold" onClick={() => finish(false)}>
        {t('skipSetup')}
      </button>
    </header>
    <main id="main" className="nav-clearance min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[var(--bg)] px-4 pt-4">
      <p className="text-sm font-semibold text-[var(--muted)]">{t('appName')}</p>
      {step > 0 && (
        <p className="mt-4 text-sm font-semibold">
          {step} / {STEPS - 1}
        </p>
      )}
      {step === 0 && (
        <section className="mt-6 space-y-4">
          <h1 className="text-3xl font-semibold">{t('onboarding.welcome')}</h1>
          <p>{t('onboarding.welcomeBody')}</p>
          <button type="button" className="tap w-full rounded-2xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]" onClick={() => setStep(1)}>
            {t('next')}
          </button>
        </section>
      )}
      {step === 1 && (
        <section className="mt-4">
          <h1 className="text-2xl font-semibold">{t('onboarding.language')}</h1>
          <p className="mt-2">{t('onboarding.languageBody')}</p>
          <div className="mt-4">
            <LanguagePicker
              language={prefs.language}
              t={t}
              onPick={(item) => updatePrefs({ language: item.id })}
            />
          </div>
        </section>
      )}
      {step === 2 && (
        <section className="mt-4 space-y-4">
          <h1 className="text-2xl font-semibold">{t('onboarding.text')}</h1>
          <p>{t('onboarding.textBody')}</p>
          <label className="block font-semibold" htmlFor="text-size">
            {prefs.textSize}px
            <input
              id="text-size"
              type="range"
              min={16}
              max={21}
              step={1}
              value={prefs.textSize}
              onChange={(event) => updatePrefs({ textSize: Number(event.target.value) })}
              className="mt-2 w-full"
            />
          </label>
          <p className="card p-4">{t('onboarding.preview', { name: profile.shortName?.trim() || profile.name?.trim() || t('you') })}</p>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={prefs.boldText} onChange={(event) => updatePrefs({ boldText: event.target.checked })} />
            {t('onboarding.bold')}
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={prefs.highContrast} onChange={(event) => updatePrefs({ highContrast: event.target.checked })} />
            {t('onboarding.contrast')}
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={prefs.dyslexiaFont} onChange={(event) => updatePrefs({ dyslexiaFont: event.target.checked })} />
            {t('settings.dyslexiaFont')}
          </label>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={prefs.easierTapping} onChange={(event) => updatePrefs({ easierTapping: event.target.checked })} />
            {t('settings.easierTapping')}
          </label>
        </section>
      )}
      {step === 3 && (
        <section className="mt-4">
          <h1 className="text-2xl font-semibold">{t('onboarding.colour')}</h1>
          <div role="radiogroup" aria-label={t('onboarding.colour')} className="mt-4 space-y-2">
            {(['default', 'protanopia', 'deuteranopia', 'tritanopia', 'monochrome'] as ColourVision[]).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={prefs.colourVision === mode}
                className="tap w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 text-left"
                onClick={() => updatePrefs({ colourVision: mode })}
              >
                <span className="font-semibold">{t(`cvd.${mode}`)}</span>
                <span className="mt-2 flex gap-3 text-sm">
                  <span className="inline-flex items-center gap-1 text-[var(--success)]"><CheckCircle2 aria-hidden size={16} />{t('cvd.paid')}</span>
                  <span className="inline-flex items-center gap-1 text-[var(--warning)]"><AlertTriangle aria-hidden size={16} />{t('cvd.check')}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      {step === 4 && (
        <section className="mt-4 space-y-3">
          <h1 className="text-2xl font-semibold">{t('onboarding.detail')}</h1>
          {(['short', 'full'] as DetailLevel[]).map((detail) => (
            <button
              key={detail}
              type="button"
              role="radio"
              aria-checked={prefs.detail === detail}
              className="tap w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 text-left"
              onClick={() => updatePrefs({ detail })}
            >
              <span className="font-semibold">{t(`detail.${detail}`)}</span>
              <span className="mt-1 block font-normal">{t(`detail.${detail}Sample`)}</span>
            </button>
          ))}
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" checked={prefs.readAloud} onChange={(event) => updatePrefs({ readAloud: event.target.checked })} />
            {t('onboarding.readAloud')}
          </label>
          <p className="text-[var(--muted)]">{t('onboarding.readBody')}</p>
          <h2 className="pt-2 text-xl font-semibold">{t('onboarding.voiceLimit')}</h2>
          <p className="text-[var(--muted)]">{t('onboarding.voiceLimitBody')}</p>
          <VoiceLimitChoices
            value={prefs.voiceTransferLimit}
            onChange={(voiceTransferLimit) => updatePrefs({ voiceTransferLimit })}
            offLabel={t('settings.voiceLimitOff')}
            label={t('onboarding.voiceLimit')}
          />
        </section>
      )}
      {step === 5 && (
        <section className="mt-4 space-y-3">
          <h1 className="text-2xl font-semibold">{t('onboarding.help')}</h1>
          {([
            ['ai', 'help.ai'],
            ['guide', 'help.guide'],
            ['staff', 'help.staff'],
          ] as [HelpPreference, string][]).map(([id, key]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={prefs.helpPreference === id}
              className="tap w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 text-left font-semibold"
              onClick={() => updatePrefs({ helpPreference: id })}
            >
              {t(key)}
            </button>
          ))}
          <h2 className="pt-4 text-2xl font-semibold">{t('onboarding.ready')}</h2>
          <p>{t('onboarding.readyBody')}</p>
          <button type="button" className="tap w-full rounded-2xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]" onClick={() => finish(true)}>
            {t('help.guide')}
          </button>
          <button type="button" className="tap w-full rounded-2xl border border-[var(--line)]" onClick={() => finish(false)}>
            {t('onboarding.enter')}
          </button>
        </section>
      )}
      {step > 0 && step < 5 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="tap min-w-0 flex-1 whitespace-normal rounded-2xl border border-[var(--line)]" onClick={() => setStep((n) => n - 1)}>
            {t('back')}
          </button>
          <button type="button" className="tap min-w-0 flex-1 whitespace-normal rounded-2xl border border-[var(--line)]" onClick={() => setStep((n) => n + 1)}>
            {t('skipStep')}
          </button>
          <button type="button" className="tap min-w-0 flex-1 whitespace-normal rounded-2xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]" onClick={() => setStep((n) => n + 1)}>
            {t('next')}
          </button>
        </div>
      )}
    </main>
    <BottomNav />
    </div>
  )
}
