import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Choice, choiceClass } from '@/components/Choice'
import { ShortcutPicker } from '@/components/ShortcutPicker'
import { SpeechSpeed } from '@/components/SpeechSpeed'
import { Page } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { prepareBackground } from '@/lib/contrast'
import { beginShowHow, takeShowHow } from '@/lib/showHow'
import { DEFAULT_SHORTCUTS, DIALECTS, LANGUAGES, SHORTCUTS, THEMES } from '@/lib/languages'
import type { ColourVision, HelpPreference, ThemeId } from '@/lib/types'

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
  useEffect(() => { onResult?.(id, shown) }, [id, shown])
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
  const remember = (id: string, value: boolean) => setShown((prev) => (prev[id] === value ? prev : { ...prev, [id]: value }))
  const prefsRef = useRef(app.prefs)
  prefsRef.current = app.prefs
  useEffect(() => {
    if (window.location.hash === '#shortcuts') setOpen((current) => ({ ...current, shortcuts: true }))
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

  const toggle = (id: string) => setOpen((current) => ({ ...current, [id]: !current[id] }))
  const language = LANGUAGES.find((item) => item.id === app.prefs.language)
  const theme = THEMES.find((item) => item.id === app.prefs.theme)
  const textSummary = [
    app.prefs.textSize >= 22 ? t('settings.large') : `${app.prefs.textSize}px`,
    app.prefs.boldText ? t('onboarding.bold') : '',
    app.prefs.highContrast ? t('onboarding.contrast') : '',
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
          keywords={`${t('settings.language')} ${t('dialects.title')} ${t('onboarding.readAloud')} ${t('speed')} ${LANGUAGES.map((item) => `${item.native} ${item.english}`).join(' ')} ${DIALECTS.map((item) => t(`dialects.${item.id}`)).join(' ')}`}
          query={query}
          open={!!open.language}
          onToggle={toggle}
        >
          <div role="radiogroup" aria-label={t('onboarding.language')}>
            {LANGUAGES.map((item) => (
              <Choice key={item.id} selected={app.prefs.language === item.id} onClick={() => app.updatePrefs({ language: item.id })}>
                <span className="block">{item.native}</span>
                {app.prefs.language === 'en' && <span className="block text-sm font-medium text-[var(--muted)]">{item.english}</span>}
              </Choice>
            ))}
          </div>
          {(app.prefs.language === 'zh' || app.prefs.language === 'zh-TW') && (
          <p className="mt-3 text-sm font-normal leading-snug text-[var(--muted)]">{t('dialects.note')}</p>
          )}
          {(app.prefs.language === 'zh' || app.prefs.language === 'zh-TW') && (
            <div className="mt-2" role="radiogroup" aria-label={t('dialects.title')}>
              <Choice selected={app.prefs.dialect !== 'cantonese'} onClick={() => app.updatePrefs({ dialect: 'standard' })}>{t('dialects.standard')}</Choice>
              <Choice selected={app.prefs.dialect === 'cantonese'} onClick={() => app.updatePrefs({ dialect: 'cantonese' })}>{t('dialects.cantonese')}</Choice>
            </div>
          )}
          <div className="mt-3 flex min-h-11 items-center justify-between gap-3" data-guide="settings-read">
            <span className="min-w-0">
              <span className="block font-semibold">{t('onboarding.readAloud')}</span>
              <span className="block text-sm font-normal text-[var(--muted)]">{t('onboarding.readAloudBody')}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={app.prefs.readAloud}
              aria-label={t('onboarding.readAloud')}
              className="relative shrink-0 rounded-full"
              style={{ background: app.prefs.readAloud ? 'var(--accent)' : '#d4d4d8', height: '1.75rem', width: '3rem' }}
              onClick={() => app.updatePrefs({ readAloud: !app.prefs.readAloud })}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white ${app.prefs.readAloud ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
          <SpeechSpeed />
        </Section>

        <Section only={panel} onResult={remember}
          id="text"
          guide="settings-text"
          title={t('settings.sections.text')}
          summary={textSummary}
          keywords={`${t('settings.text')} ${t('settings.textSize')} ${t('onboarding.bold')} ${t('onboarding.contrast')} ${t('settings.large')}`}
          query={query}
          open={!!open.text}
          onToggle={toggle}
        >
          <p className="mb-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3">{t('onboarding.preview')}</p>
          <label htmlFor="size" className="block font-semibold">
            {t('settings.textSize')}: {app.prefs.textSize}px
            <input id="size" type="range" min={16} max={24} value={app.prefs.textSize} onChange={(event) => app.updatePrefs({ textSize: Number(event.target.value) })} className="mt-2 w-full" />
          </label>
          <label className="mt-2 flex min-h-12 items-center gap-3"><input type="checkbox" checked={app.prefs.boldText} onChange={(event) => app.updatePrefs({ boldText: event.target.checked })} />{t('onboarding.bold')}</label>
          <label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={app.prefs.highContrast} onChange={(event) => app.updatePrefs({ highContrast: event.target.checked })} />{t('onboarding.contrast')}</label>
        </Section>

        <Section only={panel} onResult={remember}
          id="colour"
          title={t('settings.sections.colour')}
          summary={`${theme ? t(theme.labelKey) : t('themes.custom')} · ${t(`themes.${app.prefs.scheme}`)} · ${t(`cvd.${app.prefs.colourVision}`)}`}
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
              <button key={scheme} type="button" aria-pressed={app.prefs.scheme === scheme} className={`${choiceClass(app.prefs.scheme === scheme)} inline-flex min-h-12 min-w-0 flex-1 basis-24 items-center justify-between gap-2 whitespace-normal rounded-xl px-3`} onClick={() => app.updatePrefs({ scheme })}>
                {t(`themes.${scheme}`)}
                <Check aria-hidden size={18} className={`shrink-0 text-[var(--accent)] ${app.prefs.scheme === scheme ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            ))}
          </div>
          <div className={`grid gap-2 ${app.prefs.textSize >= 20 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {THEMES.filter((item) => item.id !== 'custom').map((item) => (
              <button key={item.id} type="button" aria-pressed={app.prefs.theme === item.id} className={`${choiceClass(app.prefs.theme === item.id)} flex min-h-12 items-center gap-2 rounded-xl px-3 text-left`} onClick={() => app.updatePrefs({ theme: item.id as ThemeId, accent: item.accent })}>
                <span aria-hidden className="h-6 w-6 shrink-0 rounded-full border border-black/20" style={{ background: item.accent }} />
                <span className="min-w-0 flex-1">{t(item.labelKey)}</span>
                <Check aria-hidden size={18} className={`shrink-0 text-[var(--accent)] ${app.prefs.theme === item.id ? 'opacity-100' : 'opacity-0'}`} />
              </button>
            ))}
          </div>
          <label htmlFor="accent" className="mt-3 flex min-h-12 items-center gap-3 font-semibold">
            {t('themes.accent')}
            <input id="accent" type="color" value={app.prefs.accent} onChange={(event) => app.updatePrefs({ theme: 'custom', accent: event.target.value })} />
          </label>
          <div className="mt-4">
            <p className="mb-2 font-semibold">{t('themes.background')}</p>
            <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl bg-[var(--accent)] px-3 text-[var(--on-accent)]">
              {t('themes.upload')}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  try {
                    const result = await prepareBackground(file)
                    app.updatePrefs({ backgroundImage: result.dataUrl, backgroundOverlay: result.overlay, contrastWarning: result.warn })
                  } catch {
                    app.setNotice(t('imageTooBig'))
                  }
                }}
              />
            </label>
            {app.prefs.backgroundImage && (
              <button type="button" className="ml-2 mt-2 min-h-12 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3" onClick={() => app.updatePrefs({ backgroundImage: null, contrastWarning: false })}>
                {t('themes.removePhoto')}
              </button>
            )}
            {app.prefs.contrastWarning && <p className="mt-2" role="status">{t('contrastWarn')}</p>}
          </div>
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
          summary={order.slice(0, 2).map((id) => t(`shortcuts.${id}`)).join(' · ')}
          keywords={`${t('settings.shortcuts')} ${SHORTCUTS.map((id) => t(`shortcuts.${id}`)).join(' ')} ${t('reorderHint')}`}
          query={query}
          open={!!open.shortcuts}
          onToggle={toggle}
        >
          <div>
            <ShortcutPicker order={order} onChange={setOrder} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="min-h-12 flex-1 rounded-xl bg-[var(--accent)] text-[var(--on-accent)]" disabled={order.length !== 6} onClick={() => app.updatePrefs({ shortcuts: order })}>{t('save')}</button>
              <button type="button" className="min-h-12 flex-1 rounded-xl border border-[var(--line)] bg-[var(--card)]" onClick={() => setOrder([...DEFAULT_SHORTCUTS])}>{t('reset')}</button>
            </div>
          </div>
        </Section>

        <Section only={panel} onResult={remember}
          id="privacy"
          title={t('settings.sections.privacy')}
          summary={app.prefs.spendingInsights ? t('settings.insightsOn') : t('settings.insightsOff')}
          keywords={`${t('settings.insights')} ${t('settings.insightsOn')} ${t('settings.insightsOff')}`}
          query={query}
          open={!!open.privacy}
          onToggle={toggle}
        >
          <label className="flex min-h-12 items-center gap-3 font-semibold">
            <input type="checkbox" checked={app.prefs.spendingInsights} onChange={(event) => app.updatePrefs({ spendingInsights: event.target.checked })} />
            {t('settings.insights')}
          </label>
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
          <p className="mb-2 text-sm text-[var(--muted)]">{t('settings.resetBody')}</p>
          <button type="button" className="min-h-12 rounded-xl border border-[var(--danger)] px-3 text-[var(--danger)]" onClick={app.resetDemo}>
            {t('settings.reset')}
          </button>
        </Section>
      </div>
    </Page>
  )
}

const VOICE_LABEL: Record<string, string> = {
  en: 'English voice',
  ms: 'Suara Melayu',
  ta: 'தமிழ் குரல்',
  id: 'Suara Indonesia',
  vi: 'Giọng Việt',
  th: 'เสียงไทย',
  tl: 'Boses Filipino',
  ko: '한국어 음성',
  ja: '日本語の音声',
  hi: 'हिन्दी आवाज़',
  bn: 'বাংলা কণ্ঠ',
}

function voiceSummary(language: string, dialect: string, native: string, t: (key: string) => string) {
  if (language === 'zh' || language === 'zh-TW') {
    const cantonese = dialect === 'cantonese'
    const voice = language === 'zh-TW' ? (cantonese ? '粵語' : '普通話') : (cantonese ? '粤语' : '普通话')
    return `${native} · ${voice}`
  }
  return `${native} · ${VOICE_LABEL[language] || t('voice.en')}`
}
