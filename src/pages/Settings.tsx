import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Choice, choiceClass, choiceRowClass } from '@/components/Choice'
import { Switch } from '@/components/Switch'
import { ShortcutPicker } from '@/components/ShortcutPicker'
import { SpeechSpeed } from '@/components/SpeechSpeed'
import { VoiceLimitChoices } from '@/components/VoiceLimitChoices'
import { VoiceTransferAuthSheet } from '@/components/VoiceTransferAuthSheet'
import { clampVoiceTransferLimit, formatVoiceTransferAmount } from '@/lib/voiceTransfer'
import { Page } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { TEXT_SIZE_MAX } from '@/lib/readingComfort'
import { beginShowHow, takeShowHow } from '@/lib/showHow'
import { getFlowTour, guideById, startGuide, subscribeFlowTour } from '@/lib/guide'
import { markTourDropped, markTourFinished, markTourOpened, markTourStep } from '@/lib/tourTracking'
import { speak } from '@/lib/speech'
import { collapseOpened } from '@/lib/tourPlace'
import { ResetDemoDialog } from '@/components/ResetDemoDialog'
import { HomePreview } from '@/components/HomePreview'
import { ReadingComfortControls } from '@/components/ReadingComfortControls'
import { UndoSnackbar } from '@/components/UndoSnackbar'
import { patchForPreset, snapshotPrefs, type PresetId, type PresetSnapshot } from '@/lib/presets'
import { dismissPreviewLanguageNotice, LanguagePicker } from '@/components/LanguagePicker'
import { DEFAULT_SHORTCUTS, DIALECTS, LANGUAGES, SHORTCUTS, THEMES } from '@/lib/languages'
import type { ColourVision, HelpPreference, ThemeId, VoiceTransferConfirm } from '@/lib/types'

function Section({
  id,
  anchor,
  guide,
  title,
  summary,
  keywords,
  query,
  open,
  onToggle,
  onResult,
  only,
  children,
}: {
  id: string
  anchor?: string
  guide?: string
  title: string
  summary: string
  keywords: string
  query: string
  open: boolean
  onToggle: (id: string) => void
  onResult?: (id: string, shown: boolean) => void
  only?: string
  children: ReactNode
}) {
  const q = query.trim().toLowerCase()
  const hay = `${title} ${summary} ${keywords}`.toLowerCase()
  const shown = (!only || only === id) && (!q || hay.includes(q))
  useEffect(() => { onResult?.(id, shown) }, [id, shown, onResult])
  if (!shown) return null
  const expanded = only === id || (q ? true : open)
  return (
    <section id={anchor} className="border-b border-[var(--line)]">
      <h2>
        <button
          type="button"
          data-guide={guide}
          className="flex w-full min-h-12 items-center gap-3 py-3 text-left"
          aria-expanded={expanded}
          aria-controls={`settings-${id}`}
          onClick={() => onToggle(id)}
        >
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug">{title}</span>
            <span className="block text-[0.85rem] leading-snug text-[var(--muted)]">{summary}</span>
          </span>
          <ChevronDown aria-hidden className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </h2>
      <div id={`settings-${id}`} role="region" hidden={!expanded} className="pb-4">
        {children}
      </div>
    </section>
  )
}

export function Settings() {
  const app = useApp()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [order, setOrder] = useState(app.prefs.shortcuts)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [shown, setShown] = useState<Record<string, boolean>>({})
  const [params, setParams] = useSearchParams()
  const routePanel = useParams().panel || ''
  const panel = routePanel || params.get('panel') || ''
  const [greet, setGreet] = useState(app.profile.shortName)
  const [resetOpen, setResetOpen] = useState(false)
  const [undo, setUndo] = useState<PresetSnapshot | null>(null)
  const [pendingConfirmMode, setPendingConfirmMode] = useState<VoiceTransferConfirm | null>(null)
  const [confirmModeAuthOpen, setConfirmModeAuthOpen] = useState(false)
  const applyPreset = (id: PresetId) => {
    setUndo(snapshotPrefs(app.prefs))
    app.updatePrefs(patchForPreset(id))
  }
  const remember = useCallback((id: string, value: boolean) => setShown((prev) => (prev[id] === value ? prev : { ...prev, [id]: value })), [])
  const prefsRef = useRef(app.prefs)
  prefsRef.current = app.prefs
  useEffect(() => {
    if (window.location.hash === '#shortcuts') setOpen((current) => ({ ...current, shortcuts: true }))
    if (window.location.hash === '#voice-limit') {
      setOpen((current) => ({ ...current, language: true }))
      window.setTimeout(() => document.getElementById('voice-limit')?.scrollIntoView({ block: 'center' }), 0)
    }
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const job = takeShowHow('settings')
      if (!job) return
      const result = beginShowHow(app, () => prefsRef.current, job.journeyId, job.practice, t)
      if (!result?.started) app.setNotice(t('guideEmpty'))
    }, 400)
    return () => window.clearTimeout(timer)
    // Start once if the assistant sent the customer here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (params.get('tour') !== '1' || panel) return
    const timer = window.setTimeout(() => {
      const result = startGuide({
        guideId: 'settings',
        text: t,
        readAloud: app.prefs.readAloud,
        speak: (text) => speak(text, { language: app.prefs.language, rate: app.prefs.speechRate, dialect: app.prefs.dialect }),
        onMissing: (element, stepId) => {
          app.log('guide_step_missing', { guideId: 'settings', element, stepId })
        },
        onStart: (guideId) => {
          const total = guideById(guideId)?.steps.length || 0
          if (total) markTourOpened(app.profile.id, guideId, total)
          app.log('guide_started', { guideId })
        },
        onStep: (stepId) => {
          app.setGuideStep(`settings:${stepId}`)
          const tour = getFlowTour()
          if (tour) markTourStep(app.profile.id, 'settings', tour.index, tour.steps.length)
        },
        onDrop: (guideId, stepId) => {
          const tour = getFlowTour()
          if (tour) markTourDropped(app.profile.id, guideId, tour.index, tour.steps.length)
          app.log('guide_dropped', { guideId, stepId })
        },
        onDone: (guideId) => {
          markTourFinished(app.profile.id, guideId, false)
          app.log('guide_completed', { guideId })
          collapseOpened()
          setParams((current) => {
            const next = new URLSearchParams(current)
            next.delete('tour')
            return next
          }, { replace: true })
        },
      })
      if (!result.started) app.setNotice(t('guideEmpty'))
    }, 400)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, panel])

  useEffect(() => {
    const openForTour = () => {
      const tour = getFlowTour()
      if (!tour || tour.guideId !== 'settings') return
      const id = tour.steps[tour.index]?.id
      if (!id || id === 'end') return
      const section = id === 'read' ? 'language' : id
      setOpen((current) => (current[section] ? current : { ...current, [section]: true }))
    }
    openForTour()
    const off = subscribeFlowTour(openForTour)
    return () => {
      off()
    }
  }, [])

  const toggle = (id: string) => setOpen((current) => ({ ...current, [id]: !current[id] }))
  const language = LANGUAGES.find((item) => item.id === app.prefs.language)
  const theme = THEMES.find((item) => item.id === app.prefs.theme)
  const previewName = (app.profile.shortName || '').toLowerCase().includes('arif') ? 'Siti Aminah' : 'Tan Wei Ming'
  const textSummary = [
    app.prefs.textSize >= 20 ? t('settings.large') : `${app.prefs.textSize}px`,
    app.prefs.boldText ? t('onboarding.bold') : '',
    app.prefs.highContrast ? t('onboarding.contrast') : '',
    app.prefs.dyslexiaFont ? t('settings.dyslexiaFont') : '',
    app.prefs.letterSpacing === 'wider' ? t('settings.letterSpacingWider')
      : app.prefs.letterSpacing === 'widest' ? t('settings.letterSpacingWidest') : '',
    app.prefs.lineHeight === 'roomy' ? t('settings.lineHeightRoomy')
      : app.prefs.lineHeight === 'extraRoomy' ? t('settings.lineHeightExtraRoomy') : '',
    app.prefs.readingRuler ? t('settings.readingRuler') : '',
    app.prefs.easierTapping ? t('settings.easierTapping') : '',
  ].filter(Boolean).join(' · ')
  const helpKey = app.prefs.helpPreference === 'ai' ? 'help.ai' : app.prefs.helpPreference === 'guide' ? 'help.guide' : 'help.staff'

  return (
    <Page title={t('settings.title')} back>
      <div className="px-4 pb-4">
        {!panel && (
          <div className="pb-4 pt-3">
            <h2 className="text-[22px] font-bold leading-tight">{t('look.shape')}</h2>
            <div className="mt-3 grid grid-cols-3 gap-3 rounded-xl bg-[var(--card)] p-3 text-center">
              {[
                ['shortcuts', t('settings.sections.shortcuts')],
                ['text', t('settings.sections.text')],
                ['colour', t('settings.sections.colour')],
                ['language', t('settings.sections.language')],
                ['help', t('settings.sections.help')],
                ['privacy', t('settings.sections.privacy')],
              ].map(([id, label]) => (
                <button key={id} type="button" className="min-h-11 text-[14px] font-normal" onClick={() => setParams({ panel: id })}>{label}</button>
              ))}
            </div>
            <h3 className="mt-4 text-[18px] font-bold">{t('look.hiName')}</h3>
            <p className="text-[14px] text-[var(--muted)]">{t('look.greetTell')}</p>
            <input className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-2 text-[16px]" aria-label={t('look.hiName')} value={greet} onChange={(event) => setGreet(event.target.value)} onBlur={() => app.setProfile({ ...app.profile, shortName: greet.trim() || app.profile.shortName })} />
            <p className="mt-1 text-[13px] text-[var(--muted)]">{t('look.greetHelp')}</p>
          </div>
        )}
        <label className="relative mb-2 block pt-3 font-semibold" htmlFor="settings-search">
          {t('gate.search')}
          <Search aria-hidden size={18} className="pointer-events-none absolute bottom-3.5 left-3 text-[var(--muted)]" />
          <input
            id="settings-search"
            type="search"
            value={query}
            placeholder={t('gate.searchPh')}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] py-2 pl-10 pr-3"
          />
        </label>
        {query.trim() && Object.values(shown).some(Boolean) === false && Object.keys(shown).length > 0 && (
          <p className="py-6 text-center font-semibold">{t('gate.noMatch', { q: query.trim() })}</p>
        )}

        <Section only={panel} onResult={remember}
          id="language"
          guide="settings-language"
          title={t('settings.sections.language')}
          summary={voiceSummary(app.prefs.language, app.prefs.dialect, language?.native || '', t)}
          keywords={`${t('settings.language')} ${t('dialects.title')} ${t('onboarding.readAloud')} ${t('speed')} ${t('settings.voiceLimit')} ${LANGUAGES.map((item) => `${item.native} ${item.english}`).join(' ')} ${DIALECTS.map((item) => t(`dialects.${item.id}`)).join(' ')}`}
          query={query}
          open={!!open.language}
          onToggle={toggle}
        >
          <LanguagePicker
            language={app.prefs.language}
            t={t}
            onPick={(item) => app.updatePrefs({ language: item.id, dialect: item.id === 'zh-TW' ? 'cantonese' : item.id === 'zh' ? 'standard' : app.prefs.dialect })}
            onPreviewPick={(item) => {
              app.setNotice(translate(item.id, 'languages.switchNotice'))
              dismissPreviewLanguageNotice()
            }}
          />
          <p className="mt-3 text-sm font-normal leading-snug text-[var(--muted)]">{t('dialects.note')}</p>
          <div className="mt-2" role="radiogroup" aria-label={t('dialects.title')}>
            <Choice selected={app.prefs.dialect !== 'cantonese'} onClick={() => app.updatePrefs({ dialect: 'standard' })}>{t('dialects.standard')}</Choice>
            <Choice selected={app.prefs.dialect === 'cantonese'} onClick={() => app.updatePrefs({ dialect: 'cantonese' })}>{t('dialects.cantonese')}</Choice>
          </div>
          <div className="mt-3 flex min-h-11 items-center justify-between gap-3" data-guide="settings-read">
            <span className="min-w-0">
              <span className="block font-semibold">{t('onboarding.readAloud')}</span>
              <span className="block text-sm font-normal text-[var(--muted)]">{t('onboarding.readAloudBody')}</span>
            </span>
            <Switch on={app.prefs.readAloud} label={t('onboarding.readAloud')} onChange={(next) => app.updatePrefs({ readAloud: next })} />
          </div>
          <SpeechSpeed />
        </Section>

        <Section only={panel} onResult={remember}
          id="safety"
          title={t('settings.sections.safety')}
          summary={
            app.prefs.voiceTransferLimit === 0
              ? `${t('settings.voiceLimitOff')} · ${t(app.prefs.voiceTransferConfirm === 'pin' ? 'settings.voiceConfirmPin' : 'settings.voiceConfirmFace')}`
              : `${t('settings.voiceLimitSummary', { amount: formatVoiceTransferAmount(clampVoiceTransferLimit(app.prefs.voiceTransferLimit)) })} · ${t(app.prefs.voiceTransferConfirm === 'pin' ? 'settings.voiceConfirmPin' : 'settings.voiceConfirmFace')}`
          }
          keywords={`${t('settings.voiceLimit')} ${t('settings.voiceTransferConfirm')} ${t('settings.sections.safety')}`}
          query={query}
          open={!!open.safety}
          onToggle={toggle}
        >
          <p className="mb-2 text-sm font-normal leading-snug text-[var(--muted)]">{t('settings.voiceLimitBody')}</p>
          <VoiceLimitChoices
            value={app.prefs.voiceTransferLimit}
            onChange={(voiceTransferLimit) => app.updatePrefs({ voiceTransferLimit })}
            offLabel={t('settings.voiceLimitOff')}
            label={t('settings.voiceLimit')}
            confirmRaise
            confirmMode={app.prefs.voiceTransferConfirm}
            easierTapping={app.prefs.easierTapping}
            readAloud={app.prefs.readAloud}
            practice
            t={t}
          />
          <VoiceTransferAuthSheet
            open={confirmModeAuthOpen}
            confirmMode={app.prefs.voiceTransferConfirm}
            easierTapping={app.prefs.easierTapping}
            readAloud={app.prefs.readAloud}
            practice
            t={t}
            onClose={() => {
              setConfirmModeAuthOpen(false)
              setPendingConfirmMode(null)
            }}
            onVerified={() => {
              if (pendingConfirmMode) app.updatePrefs({ voiceTransferConfirm: pendingConfirmMode })
              setConfirmModeAuthOpen(false)
              setPendingConfirmMode(null)
            }}
            onLocked={() => {
              setConfirmModeAuthOpen(false)
              setPendingConfirmMode(null)
            }}
          />
          <div className="mt-4 border-t border-[var(--line)] pt-4">
            <p className="mb-2 font-semibold">{t('settings.voiceTransferConfirm')}</p>
            <p className="mb-2 text-sm font-normal leading-snug text-[var(--muted)]">{t('settings.voiceTransferConfirmBody')}</p>
            <div className="grid gap-2" role="radiogroup" aria-label={t('settings.voiceTransferConfirm')}>
              {(['faceId', 'pin'] as VoiceTransferConfirm[]).map((mode) => (
                <Choice
                  key={mode}
                  selected={app.prefs.voiceTransferConfirm === mode}
                  onClick={() => {
                    if (mode === app.prefs.voiceTransferConfirm) return
                    setPendingConfirmMode(mode)
                    setConfirmModeAuthOpen(true)
                  }}
                >
                  {t(mode === 'faceId' ? 'settings.voiceConfirmFace' : 'settings.voiceConfirmPin')}
                </Choice>
              ))}
            </div>
          </div>
        </Section>

        <Section only={panel} onResult={remember}
          id="text"
          guide="settings-text"
          title={t('settings.sections.text')}
          summary={textSummary}
          keywords={`${t('settings.text')} ${t('settings.textSize')} ${t('onboarding.bold')} ${t('onboarding.contrast')} ${t('settings.large')} ${t('settings.readingComfort')} ${t('settings.dyslexiaFont')} ${t('settings.easierTapping')}`}
          query={query}
          open={!!open.text}
          onToggle={toggle}
        >
          <div className="mb-3 flex flex-wrap gap-2">
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
          <label htmlFor="size" className="block font-semibold">
            {t('settings.textSize')}: {app.prefs.textSize}px
            <input id="size" type="range" min={16} max={TEXT_SIZE_MAX} value={app.prefs.textSize} onChange={(event) => app.updatePrefs({ textSize: Number(event.target.value) })} className="mt-2 w-full" />
          </label>
          <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
            <span className="min-w-0 font-semibold">{t('onboarding.bold')}</span>
            <Switch on={app.prefs.boldText} label={t('onboarding.bold')} onChange={(next) => app.updatePrefs({ boldText: next })} />
          </div>
          <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
            <span className="min-w-0 font-semibold">{t('onboarding.contrast')}</span>
            <Switch on={app.prefs.highContrast} label={t('onboarding.contrast')} onChange={(next) => app.updatePrefs({ highContrast: next })} />
          </div>
          <ReadingComfortControls headingId="settings-reading-comfort" />
          <div className="mt-3 flex min-h-12 items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block font-semibold">{t('settings.easierTapping')}</span>
              <span className="block text-sm font-normal text-[var(--muted)]">{t('settings.easierTappingBody')}</span>
            </span>
            <Switch on={app.prefs.easierTapping} label={t('settings.easierTapping')} onChange={(next) => app.updatePrefs({ easierTapping: next })} />
          </div>
        </Section>

        <Section only={panel} onResult={remember}
          id="colour"
          guide="settings-colour"
          title={t('settings.sections.colour')}
          summary={app.prefs.colourVision === 'monochrome' ? t('cvd.monoSummary') : `${theme ? t(theme.labelKey) : t('themes.custom')} · ${t(`themes.${app.prefs.scheme}`)} · ${t(`cvd.${app.prefs.colourVision}`)}`}
          keywords={`${t('settings.colour')} ${t('themes.title')} ${t('themes.background')} ${t('themes.light')} ${t('themes.dark')} ${THEMES.map((item) => t(item.labelKey)).join(' ')} default protanopia deuteranopia tritanopia monochrome`}
          query={query}
          open={!!open.colour}
          onToggle={toggle}
        >
          {(['default', 'protanopia', 'deuteranopia', 'tritanopia', 'monochrome'] as ColourVision[]).map((mode) => (
            <Choice key={mode} selected={app.prefs.colourVision === mode} onClick={() => app.updatePrefs({ colourVision: mode })}>
              {t(`cvd.${mode}`)}
            </Choice>
          ))}
          <div className="mb-3 mt-3 flex flex-wrap gap-2">
            {(['light', 'dark'] as const).map((scheme) => (
              <button key={scheme} type="button" aria-pressed={app.prefs.scheme === scheme} className={choiceRowClass(app.prefs.scheme === scheme, 'min-h-12 min-w-0 flex-1 basis-24 whitespace-normal')} onClick={() => app.updatePrefs({ scheme })}>
                <span className="choice-label min-w-0">{t(`themes.${scheme}`)}</span>
                <Check aria-hidden size={18} className={`shrink-0 justify-self-end text-[var(--accent)] ${app.prefs.scheme === scheme ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            ))}
          </div>
          <div className={`grid gap-2 ${app.prefs.textSize >= 20 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {THEMES.filter((item) => item.id !== 'custom').map((item) => (
              <button key={item.id} type="button" aria-pressed={app.prefs.theme === item.id} className={`${choiceClass(app.prefs.theme === item.id)} grid min-h-12 min-w-0 grid-cols-[auto_minmax(0,1fr)_1.125rem] items-center gap-2 rounded-xl px-3 py-2 text-left`} onClick={() => app.updatePrefs({ theme: item.id as ThemeId, accent: item.accent })}>
                <span aria-hidden className="h-6 w-6 shrink-0 rounded-full border border-black/20" style={{ background: item.accent }} />
                <span className="choice-label min-w-0">{t(item.labelKey)}</span>
                <Check aria-hidden size={18} className={`shrink-0 justify-self-end text-[var(--accent)] ${app.prefs.theme === item.id ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            ))}
          </div>
          <label htmlFor="accent" className="mt-3 flex min-h-12 items-center gap-3 font-semibold">
            {t('themes.accent')}
            <input id="accent" type="color" value={app.prefs.accent} onChange={(event) => app.updatePrefs({ theme: 'custom', accent: event.target.value })} />
          </label>
        </Section>

        <Section only={panel} onResult={remember}
          id="help"
          guide="settings-help"
          title={t('settings.sections.help')}
          summary={`${t(helpKey)} · ${t(`detail.${app.prefs.detail}`)}`}
          keywords={`${t('settings.helpPref')} ${t('settings.explain')} ${t('help.ai')} ${t('help.guide')} ${t('help.staff')} ${t('detail.short')} ${t('detail.full')}`}
          query={query}
          open={!!open.help}
          onToggle={toggle}
        >
          <div role="radiogroup" aria-label={t('settings.helpPref')}>
          {([
            ['ai', 'help.ai'],
            ['guide', 'help.guide'],
            ['staff', 'help.staff'],
          ] as const).map(([id, key]) => (
            <Choice key={id} selected={app.prefs.helpPreference === id} onClick={() => app.updatePrefs({ helpPreference: id as HelpPreference })}>
              {t(key)}
            </Choice>
          ))}
          </div>
          <p className="mb-2 mt-3 font-semibold">{t('settings.explain')}</p>
          <div role="radiogroup" aria-label={t('settings.explain')}>
          {(['short', 'full'] as const).map((detail) => (
            <Choice key={detail} selected={app.prefs.detail === detail} onClick={() => app.updatePrefs({ detail })}>
              {t(`detail.${detail}`)}
            </Choice>
          ))}
          </div>
        </Section>

        <Section only={panel} onResult={remember}
          id="shortcuts"
          guide="settings-shortcuts"
          anchor="shortcuts"
          title={t('settings.sections.shortcuts')}
          summary={order.slice(0, 3).map((id) => t(`shortcuts.${id}`)).join(' · ')}
          keywords={`${t('settings.shortcuts')} ${SHORTCUTS.map((id) => t(`shortcuts.${id}`)).join(' ')} ${t('reorderHint')}`}
          query={query}
          open={!!open.shortcuts}
          onToggle={toggle}
        >
          <div>
            <ShortcutPicker order={order} onChange={setOrder} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="min-h-12 flex-1 rounded-xl border border-transparent bg-[var(--accent)] text-[var(--on-accent)] disabled:cursor-not-allowed disabled:border-[var(--line)] disabled:bg-[var(--soft)] disabled:text-[var(--muted)]" disabled={order.slice(0, 3).length !== 3} onClick={() => app.updatePrefs({ shortcuts: order.slice(0, 3) })}>{t('save')}</button>
              <button type="button" className="min-h-12 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)]" onClick={() => setOrder([...DEFAULT_SHORTCUTS])}>{t('reset')}</button>
            </div>
          </div>
        </Section>

        <Section only={panel} onResult={remember}
          id="privacy"
          guide="settings-privacy"
          title={t('settings.sections.privacy')}
          summary={app.prefs.spendingInsights ? t('settings.insightsOn') : t('settings.insightsOff')}
          keywords={`${t('settings.insights')} ${t('settings.insightsOn')} ${t('settings.insightsOff')}`}
          query={query}
          open={!!open.privacy}
          onToggle={toggle}
        >
          <div className="mt-3 flex min-h-11 items-center justify-between gap-3">
            <span className="min-w-0 font-semibold">{t('settings.insights')}</span>
            <Switch on={app.prefs.spendingInsights} label={t('settings.insights')} onChange={(next) => app.updatePrefs({ spendingInsights: next })} />
          </div>
        </Section>

        <Section only={panel} onResult={remember}
          id="account"
          title={t('settings.sections.account')}
          summary={app.profile.shortName}
          keywords={`${t('gate.logout')} ${t('gate.redoQuiz')} ${t('gate.deleteUser')} ${t('settings.reset')} ${t('settings.persona')} ${t('settings.mei')} ${t('settings.arif')}`}
          query={query}
          open={!!open.account}
          onToggle={toggle}
        >
          <p className="mb-2 font-semibold">{app.profile.name}</p>
          <button type="button" className="mb-4 min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 font-semibold" onClick={app.logout}>
            {t('gate.logout')}
          </button>
          <h3 className="mb-2 font-semibold">{t('settings.persona')}</h3>
          <button type="button" className="mb-2 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-left" onClick={() => app.applyPersona('mei')}>
            <span className="block font-semibold">{t('settings.mei')}</span>
            <span className="text-sm">{t('settings.meiBody')}</span>
          </button>
          <button type="button" className="mb-4 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-left" onClick={() => app.applyPersona('arif')}>
            <span className="block font-semibold">{t('settings.arif')}</span>
            <span className="text-sm">{t('settings.arifBody')}</span>
          </button>
          <button type="button" className="mb-2 min-h-12 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3" onClick={app.resetQuiz}>
            {t('gate.redoQuiz')}
          </button>
          <p className="mb-4 text-sm text-[var(--muted)]">{t('gate.resetQuizBody')}</p>
          <button type="button" className="mb-2 min-h-12 rounded-xl border border-[var(--danger)] px-3 text-[var(--danger)]" onClick={app.deleteUser}>
            {t('gate.deleteUser')}
          </button>
          <p className="mb-4 text-sm text-[var(--muted)]">{t('gate.deleteUserBody')}</p>
          <p className="mb-2 text-sm text-[var(--muted)]">{t('settings.resetDataBody')}</p>
          <button type="button" className="mb-4 min-h-12 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 font-semibold" onClick={() => setResetOpen(true)}>
            {t('settings.resetDemoData')}
          </button>
          <ResetDemoDialog
            open={resetOpen}
            title={t('settings.resetDemoData')}
            body={t('settings.resetDataConfirm')}
            confirmLabel={t('settings.resetDemoData')}
            cancelLabel={t('cancel')}
            onCancel={() => setResetOpen(false)}
            onConfirm={() => { setResetOpen(false); app.resetDemoData() }}
          />
          <p className="mb-2 text-sm text-[var(--muted)]">{t('settings.resetBody')}</p>
          <button type="button" className="min-h-12 rounded-xl border border-[var(--danger)] px-3 text-[var(--danger)]" onClick={app.resetDemo}>
            {t('settings.reset')}
          </button>
        </Section>
        <p data-guide="settings-end" className="sr-only" aria-hidden="true">
          {t('guides.settings.endBody')}
        </p>
      </div>
      <UndoSnackbar
        snapshot={undo}
        onUndo={() => {
          if (undo) app.updatePrefs(undo)
          setUndo(null)
        }}
        onDone={() => setUndo(null)}
      />
    </Page>
  )
}

function voiceSummary(language: string, dialect: string, native: string, t: (key: string) => string) {
  if (language === 'zh' || language === 'zh-TW') {
    const cantonese = dialect === 'cantonese'
    const voice = cantonese ? t('voice.cantonese') : t('voice.mandarin')
    return `${native} · ${voice}`
  }
  const voiceKey = `voice.${language}` as const
  const voice = dialect === 'cantonese' ? t('dialects.cantonese') : (t(voiceKey) === voiceKey ? t('voice.en') : t(voiceKey))
  return `${native} · ${voice}`
}
