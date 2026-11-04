import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Choice, choiceClass } from '@/components/Choice'
import { ShortcutPicker } from '@/components/ShortcutPicker'
import { SpeechSpeed } from '@/components/SpeechSpeed'
import { useApp } from '@/context/AppContext'
import { peekAfterLogin } from '@/lib/storage'
import { translate } from '@/i18n'
import { DEFAULT_SHORTCUTS, LANGUAGES } from '@/lib/languages'
import type { ColourVision, DetailLevel, HelpPreference } from '@/lib/types'

const STEPS = 7

export function Join() {
  const app = useApp()
  const navigate = useNavigate()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<string[]>(app.prefs.shortcuts)

  useEffect(() => {
    document.getElementById('join-main')?.scrollTo(0, 0)
  }, [step, app.sessionId])

  const finish = (offer: boolean) => {
    if (offer) sessionStorage.setItem('ocbc-tour-offer', '1')
    const shortcuts = [...picked]
    for (const id of DEFAULT_SHORTCUTS) {
      if (shortcuts.length >= 6) break
      if (!shortcuts.includes(id)) shortcuts.push(id)
    }
    app.updatePrefs({ quizCompleted: true, onboarded: true, shortcuts: shortcuts.slice(0, 6) })
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
              <p className="mt-1 text-sm text-[var(--muted)]">{t('onboarding.minutes')}</p>
              <div role="radiogroup" aria-label={t('onboarding.language')} className="mt-3">
                {LANGUAGES.map((language) => (
                  <Choice key={language.id} selected={app.prefs.language === language.id} onClick={() => app.updatePrefs({ language: language.id, dialect: language.id === 'zh-TW' ? 'cantonese' : 'standard' })}>
                    {language.native}
                  </Choice>
                ))}
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
              <label className="mt-3 flex min-h-11 items-start gap-3">
                <input className="mt-1 h-6 w-6" type="checkbox" checked={app.prefs.readAloud} onChange={(event) => app.updatePrefs({ readAloud: event.target.checked })} />
                <span>
                  <span className="block font-semibold">{t('onboarding.readAloud')}</span>
                  <span className="block text-sm text-[var(--muted)]">{t('onboarding.readAloudBody')}</span>
                </span>
              </label>
              <SpeechSpeed />
            </section>
          )}
          {step === 2 && (
            <section className="space-y-3">
              <h2 id="quiz-title" className="text-xl font-semibold">{t('onboarding.text')}</h2>
              <label className="block font-semibold" htmlFor="quiz-size">
                {app.prefs.textSize}px
                <input id="quiz-size" type="range" min={16} max={24} step={1} value={app.prefs.textSize} onChange={(event) => app.updatePrefs({ textSize: Number(event.target.value) })} className="mt-2 w-full" />
              </label>
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                <p className="text-sm text-[var(--muted)]">{t('totalBalance')}</p>
                <p className="mt-1 font-semibold tabular-nums" style={{ fontSize: app.prefs.textSize + 8 }}>S$1,230.55</p>
                <p className="mt-2" style={{ fontSize: app.prefs.textSize }}>{t('onboarding.preview', { name: app.profile.shortName })}</p>
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
          {step === 5 && (
            <section>
              <h2 id="quiz-title" className="text-xl font-semibold">{t('themes.title')}</h2>
              <div role="radiogroup" aria-label={t('themes.title')} className="mt-2 grid grid-cols-2 gap-2">
                {(['light', 'dark'] as const).map((scheme) => (
                  <Choice key={scheme} selected={app.prefs.scheme === scheme} onClick={() => app.updatePrefs({ scheme })}>{t(`themes.${scheme}`)}</Choice>
                ))}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t('onboarding.colour')}</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">{t('onboarding.colourHint')}</p>
              <div className="keep-words mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
                {[
                  [t('quiz.merchant'), t('quiz.date'), 'paid', '−6.50 SGD', 'var(--success)'],
                  [t('quiz.merchant2'), t('quiz.date2'), 'check', '−12.40 SGD', 'var(--warning)'],
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
          {step === 6 && (
            <section>
              <h2 id="quiz-title" className="text-xl font-semibold">{t('onboarding.shortcuts')}</h2>
              <div className="mt-3">
                <ShortcutPicker order={picked} onChange={setPicked} />
              </div>
            </section>
          )}
        </main>
        <div className="keep-words sticky bottom-0 grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.35fr)] gap-2 border-t border-[var(--line)] bg-[var(--bg)] px-4 py-3">
          <button type="button" className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 font-semibold leading-tight text-[var(--text)]" onClick={() => (step === 0 ? app.logout() : setStep((value) => value - 1))}>
            {t('back')}
          </button>
          <button type="button" className="min-h-11 rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 font-semibold leading-tight text-[var(--text)]" onClick={() => (step === STEPS - 1 ? finish(false) : setStep((value) => value + 1))}>
            {t('skipStep')}
          </button>
          <button type="button" className="min-h-11 rounded-xl bg-[var(--accent)] px-2 font-semibold leading-tight text-[var(--on-accent)] disabled:opacity-50" disabled={step === STEPS - 1 && picked.length !== 6} onClick={() => (step === STEPS - 1 ? finish(true) : setStep((value) => value + 1))}>
            {step === STEPS - 1 ? t('done') : t('continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
