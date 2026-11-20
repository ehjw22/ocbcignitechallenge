import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Choice, choiceClass } from '@/components/Choice'
import { Switch } from '@/components/Switch'
import { ShortcutPicker } from '@/components/ShortcutPicker'
import { SpeechSpeed } from '@/components/SpeechSpeed'
import { VoiceLimitChoices } from '@/components/VoiceLimitChoices'
import { useApp } from '@/context/AppContext'
import { peekAfterLogin } from '@/lib/storage'
import { translate } from '@/i18n'
import { DEFAULT_SHORTCUTS } from '@/lib/languages'
import { HomePreview } from '@/components/HomePreview'
import { ReadingComfortControls } from '@/components/ReadingComfortControls'
import { formatSignedMoney } from '@/lib/format'
import { dismissPreviewLanguageNotice, LanguagePicker } from '@/components/LanguagePicker'
import { UndoSnackbar } from '@/components/UndoSnackbar'
import { patchForPreset, snapshotPrefs, type PresetId, type PresetSnapshot } from '@/lib/presets'
import type { ColourVision, DetailLevel, HelpPreference } from '@/lib/types'

const STEPS = 8

export function Join() {
  const app = useApp()
  const navigate = useNavigate()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<string[]>(app.prefs.shortcuts)
  const [undo, setUndo] = useState<PresetSnapshot | null>(null)
  const applyPreset = (id: PresetId) => {
    setUndo(snapshotPrefs(app.prefs))
    app.updatePrefs(patchForPreset(id))
  }

  useEffect(() => {
    document.getElementById('join-main')?.scrollTo(0, 0)
  }, [step, app.sessionId])

  const finish = (offer: boolean) => {
    if (offer) sessionStorage.setItem('ocbc-tour-offer', '1')
    const shortcuts = [...picked]
    for (const id of DEFAULT_SHORTCUTS) {
      if (shortcuts.length >= 3) break
      if (!shortcuts.includes(id)) shortcuts.push(id)
    }
    app.updatePrefs({ quizCompleted: true, onboarded: true, shortcuts: shortcuts.slice(0, 3) })
    navigate(peekAfterLogin() || (offer ? '/?offer=1' : '/'))
  }

  if (!app.sessionId) return null

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--bg)]">
      <div role="dialog" aria-modal="true" aria-labelledby="quiz-title" className="flex min-h-0 flex-1 flex-col overflow-hidden text-[var(--text)]">
        <div className="flex shrink-0 items-center justify-center gap-2 px-4 pb-2 pt-3" aria-hidden>
          {Array.from({ length: STEPS }, (_, index) => (
            <span key={index} className={`h-2.5 w-2.5 rounded-full ${index === step ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'}`} />
          ))}
        </div>
        <p className="sr-only">{t('practice.step', { n: step + 1, total: STEPS })}</p>
        <main id="join-main" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
          {step === 0 && (
            <section>
              <h2 id="quiz-title" className="text-xl font-semibold">{t('onboarding.language')}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{t('onboarding.languageBody')}</p>
              <p className="text-sm text-[var(--muted)]">{t('onboarding.minutes')}</p>
              <div className="mt-3">
                <LanguagePicker
                  language={app.prefs.language}
                  t={t}
                  onPick={(language) => app.updatePrefs({ language: language.id, dialect: language.id === 'zh-TW' ? 'cantonese' : 'standard' })}
                  onPreviewPick={(item) => {
                    app.setNotice(translate(item.id, 'languages.switchNotice'))
                    dismissPreviewLanguageNotice()
                  }}
                />
              </div>
              {(app.prefs.language === 'zh' || app.prefs.language === 'zh-TW') && (
                <div className="mt-3" role="radiogroup" aria-label={t('dialects.title')}>
                  <p className="mb-1 text-sm text-[var(--muted)]">{t('dialects.title')}</p>
                  <Choice selected={app.prefs.dialect !== 'cantonese'} onClick={() => app.updatePrefs({ dialect: 'standard' })}>{t('dialects.standard')}</Choice>
                  <Choice selected={app.prefs.dialect === 'cantonese'} onClick={() => app.updatePrefs({ dialect: 'cantonese' })}>{t('dialects.cantonese')}</Choice>
                </div>
              )}
            </section>
          )}
          {step === 1 && (
            <section>
              <h2 id="quiz-title" className="text-xl font-semibold">{t('onboarding.readAndSpeed')}</h2>
              <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
                <span>
                  <span className="block font-semibold">{t('onboarding.readAloud')}</span>
                  <span className="block text-sm text-[var(--muted)]">{t('onboarding.readAloudBody')}</span>
                </span>
                <Switch on={app.prefs.readAloud} label={t('onboarding.readAloud')} onChange={(next) => app.updatePrefs({ readAloud: next })} />
              </div>
              <SpeechSpeed />
            </section>
          )}
          {step === 5 && (
            <section className="space-y-3">
              <h2 id="quiz-title" className="text-xl font-semibold">{t('onboarding.voiceLimit')}</h2>
              <p className="text-sm text-[var(--muted)]">{t('onboarding.voiceLimitBody')}</p>
              <VoiceLimitChoices
                value={app.prefs.voiceTransferLimit}
                onChange={(voiceTransferLimit) => app.updatePrefs({ voiceTransferLimit })}
                offLabel={t('settings.voiceLimitOff')}
                label={t('onboarding.voiceLimit')}
              />
              <p className="text-sm text-[var(--muted)]">{t('onboarding.voiceConfirmHint')}</p>
            </section>
          )}
          {step === 2 && (
            <section className="space-y-3">
              <h2 id="quiz-title" className="text-xl font-semibold">{t('onboarding.text')}</h2>
              <p className="text-sm text-[var(--muted)]">{t('onboarding.textBody')}</p>
              <div className="flex flex-wrap gap-2">
                {([
                  ['easyReading', 'customise.presetEasy'],
                  ['standard', 'customise.presetStandard'],
                  ['lowVision', 'customise.presetLowVision'],
                  ['dyslexia', 'customise.presetDyslexia'],
                ] as const).map(([id, key]) => (
                  <button key={id} type="button" className="min-h-11 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 text-sm font-semibold" onClick={() => applyPreset(id)}>
                    {t(key)}
                  </button>
                ))}
              </div>
              <HomePreview />
              <label className="block font-semibold" htmlFor="quiz-size">
                {app.prefs.textSize}px
                <input id="quiz-size" type="range" min={16} max={21} step={1} value={app.prefs.textSize} onChange={(event) => app.updatePrefs({ textSize: Number(event.target.value) })} className="mt-2 w-full" />
              </label>
              <ReadingComfortControls headingId="quiz-reading-comfort" />
              <div className="flex min-h-11 items-center justify-between gap-3">
                <span>
                  <span className="block font-semibold">{t('settings.easierTapping')}</span>
                  <span className="block text-sm text-[var(--muted)]">{t('settings.easierTappingBody')}</span>
                </span>
                <Switch on={app.prefs.easierTapping} label={t('settings.easierTapping')} onChange={(next) => app.updatePrefs({ easierTapping: next })} />
              </div>
            </section>
          )}
          {step === 3 && (
            <section className="space-y-3">
              <h2 id="quiz-title" className="text-xl font-semibold">{t('onboarding.detail')}</h2>
              <div role="radiogroup" aria-label={t('onboarding.detail')} className="grid w-full grid-cols-1 gap-2 [&>button]:mb-0 [&>button]:h-full">
                {(['short', 'full'] as DetailLevel[]).map((detail) => (
                  <Choice key={detail} selected={app.prefs.detail === detail} onClick={() => app.updatePrefs({ detail })}>
                    <span className="block">{t(`detail.${detail}`)}</span>
                    <span className="mt-1 block text-sm font-medium">{t(`detail.${detail}Sample`)}</span>
                  </Choice>
                ))}
              </div>
            </section>
          )}
          {step === 4 && (
            <section className="space-y-2">
              <h2 id="quiz-title" className="text-xl font-semibold">{t('onboarding.help')}</h2>
              <div role="radiogroup" aria-label={t('onboarding.help')} className="grid w-full grid-cols-1 gap-2 [&>button]:mb-0">
                {([
                  ['ai', 'help.ai'],
                  ['guide', 'help.guide'],
                  ['staff', 'help.staff'],
                ] as [HelpPreference, string][]).map(([id, key]) => (
                  <Choice key={id} selected={app.prefs.helpPreference === id} onClick={() => app.updatePrefs({ helpPreference: id })}>
                    {t(key)}
                  </Choice>
                ))}
              </div>
            </section>
          )}
          {step === 6 && (
            <section>
              <HomePreview />
              <h2 id="quiz-title" className="mt-3 text-xl font-semibold">{t('themes.title')}</h2>
              <div role="radiogroup" aria-label={t('themes.title')} className="mt-2 grid grid-cols-2 gap-2">
                {(['light', 'dark'] as const).map((scheme) => (
                  <Choice key={scheme} selected={app.prefs.scheme === scheme} onClick={() => app.updatePrefs({ scheme })}>{t(`themes.${scheme}`)}</Choice>
                ))}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t('onboarding.colour')}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{t('onboarding.colourHint')}</p>
              <div className="keep-words mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
                {[
                  [t('quiz.merchant'), t('quiz.date'), 'paid', formatSignedMoney(-6.5, app.prefs.language), 'var(--success)'],
                  [t('quiz.merchant2'), t('quiz.date2'), 'check', formatSignedMoney(-12.4, app.prefs.language), 'var(--warning)'],
                ].map(([name, date, status, amount, colour], index) => (
                  <div key={name} className={`flex items-start justify-between gap-3 px-3 py-3 ${index === 0 ? 'border-b border-[var(--line)]' : ''}`}>
                    <span className="min-w-0">
                      <span className="block font-semibold">{name}</span>
                      <span className="block text-sm text-[var(--muted)]">{date}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold" style={{ color: colour, background: `color-mix(in srgb, ${colour} 16%, transparent)` }}>
                        {status === 'paid' ? <CheckCircle2 aria-hidden size={14} /> : <AlertTriangle aria-hidden size={14} />}
                        {t(`cvd.${status}`)}
                      </span>
                      <span className="font-semibold tabular-nums">{amount}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div role="radiogroup" aria-label={t('onboarding.colour')} className="mt-3 grid w-full grid-cols-1 gap-2">
                {(['default', 'protanopia', 'deuteranopia', 'tritanopia', 'monochrome'] as ColourVision[]).map((mode) => (
                  <button key={mode} type="button" role="radio" aria-checked={app.prefs.colourVision === mode} className={`${choiceClass(app.prefs.colourVision === mode)} flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left`} onClick={() => app.updatePrefs({ colourVision: mode })}>
                    <span className="font-semibold">{t(`cvd.${mode}`)}</span>
                    <Check aria-hidden size={18} className={`shrink-0 text-[var(--accent)] ${app.prefs.colourVision === mode ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                ))}
              </div>
            </section>
          )}
          {step === 7 && (
            <section>
              <HomePreview />
              <h2 id="quiz-title" className="mt-3 text-xl font-semibold">{t('onboarding.shortcuts')}</h2>
              <div className="mt-3">
                <ShortcutPicker order={picked} onChange={setPicked} />
              </div>
            </section>
          )}
        </main>
        <div className="keep-words sticky bottom-0 grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)] gap-2 border-t border-[var(--line)] bg-[var(--bg)] px-4 py-3">
          <button type="button" className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 font-semibold leading-tight text-[var(--text)]" onClick={() => (step === 0 ? app.logout() : setStep((value) => value - 1))}>
            {t('back')}
          </button>
          <button type="button" className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 font-semibold leading-tight text-[var(--text)]" onClick={() => (step === STEPS - 1 ? finish(false) : setStep((value) => value + 1))}>
            {t('skipStep')}
          </button>
          <button type="button" className="min-h-12 rounded-xl bg-[var(--accent)] px-2 font-semibold leading-tight text-[var(--on-accent)] disabled:opacity-50" disabled={step === STEPS - 1 && picked.length !== 3} onClick={() => (step === STEPS - 1 ? finish(true) : setStep((value) => value + 1))}>
            {step === STEPS - 1 ? t('done') : t('continue')}
          </button>
        </div>
      </div>
      <UndoSnackbar
        snapshot={undo}
        onUndo={() => {
          if (undo) app.updatePrefs(undo)
          setUndo(null)
        }}
        onDone={() => setUndo(null)}
      />
    </div>
  )
}
