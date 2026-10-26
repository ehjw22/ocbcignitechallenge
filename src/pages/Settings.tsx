import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { ShortcutPicker } from '@/components/ShortcutPicker'
import { SpeechSpeed } from '@/components/SpeechSpeed'
import { Page } from '@/components/Shell'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { prepareBackground } from '@/lib/contrast'
import { beginShowHow, takeShowHow } from '@/lib/showHow'
import { DEFAULT_SHORTCUTS, DIALECTS, LANGUAGES, SHORTCUTS, THEMES } from '@/lib/languages'
import type { ColourVision, Dialect, HelpPreference, ThemeId } from '@/lib/types'

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
  children: ReactNode
}) {
  const q = query.trim().toLowerCase()
  const hay = `${title} ${summary} ${keywords}`.toLowerCase()
  if (q && !hay.includes(q)) return null
  const expanded = q ? true : open
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
        <label className="mb-2 block pt-3 font-semibold" htmlFor="settings-search">
          {t('gate.search')}
          <input
            id="settings-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3"
          />
        </label>

        <Section
          id="language"
          guide="settings-language"
          title={t('settings.sections.language')}
          summary={`${language?.native || ''} · ${t(`dialects.${app.prefs.dialect}`)}`}
          keywords={`${t('settings.language')} ${t('dialects.title')} ${t('onboarding.readAloud')} ${t('speed')} ${LANGUAGES.map((item) => `${item.native} ${item.english}`).join(' ')} ${DIALECTS.map((item) => t(`dialects.${item.id}`)).join(' ')}`}
          query={query}
          open={!!open.language}
          onToggle={toggle}
        >
          <div className="grid gap-2">
            {LANGUAGES.map((item) => (
              <button key={item.id} type="button" aria-pressed={app.prefs.language === item.id} className="flex min-h-12 items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 text-left" onClick={() => app.updatePrefs({ language: item.id })}>
                <span>
                  <span className="block font-semibold leading-normal">{item.native}</span>
                  {app.prefs.language === 'en' && <span className="text-sm text-[var(--muted)]">{item.english}</span>}
                </span>
                {app.prefs.language === item.id && <Check aria-hidden />}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {DIALECTS.map((dialect) => (
              <div key={dialect.id} className="mb-2 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-2">
                {dialect.ready ? (
                  <label className="flex min-h-12 items-center gap-3">
                    <input type="radio" name="dialect" checked={app.prefs.dialect === dialect.id} onChange={() => app.updatePrefs({ dialect: dialect.id as Dialect })} />
                    {t(`dialects.${dialect.id}`)}
                  </label>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="font-semibold">{t(`dialects.${dialect.id}`)} <span className="rounded-full bg-[var(--soft)] px-2 py-0.5 text-sm font-normal">{t('dialects.soon')}</span></p>
                    <button type="button" className="min-h-12 rounded-xl border border-[var(--line)] px-3 text-left" onClick={() => { app.setStaffSeed(t('dialects.request', { dialect: t(`dialects.${dialect.id}`) })); app.openHelp('staff') }}>
                      {t('dialects.request', { dialect: t(`dialects.${dialect.id}`) })}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <p className="text-sm text-[var(--muted)]">{t('dialects.cloud')}</p>
          </div>
          <label className="mt-3 flex min-h-12 items-center gap-3">
            <input type="checkbox" checked={app.prefs.readAloud} onChange={(event) => app.updatePrefs({ readAloud: event.target.checked })} />
            {t('onboarding.readAloud')}
          </label>
          <SpeechSpeed />
        </Section>

        <Section
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

        <Section
          id="colour"
          title={t('settings.sections.colour')}
          summary={`${theme ? t(theme.labelKey) : t('themes.custom')} · ${t(`themes.${app.prefs.scheme}`)} · ${t(`cvd.${app.prefs.colourVision}`)}`}
          keywords={`${t('settings.colour')} ${t('themes.title')} ${t('themes.background')} ${t('themes.light')} ${t('themes.dark')} ${THEMES.map((item) => t(item.labelKey)).join(' ')} default protanopia deuteranopia tritanopia monochrome`}
          query={query}
          open={!!open.colour}
          onToggle={toggle}
        >
          {(['default', 'protanopia', 'deuteranopia', 'tritanopia', 'monochrome'] as ColourVision[]).map((mode) => (
            <label key={mode} className="mb-2 flex min-h-12 min-w-0 items-start gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3 py-2">
              <input className="mt-1 shrink-0" type="radio" name="cvd" checked={app.prefs.colourVision === mode} onChange={() => app.updatePrefs({ colourVision: mode })} />
              <span className="break-words">{t(`cvd.${mode}`)}</span>
            </label>
          ))}
          <div className="mb-3 mt-3 flex flex-wrap gap-2">
            {(['light', 'dark'] as const).map((scheme) => (
              <button key={scheme} type="button" aria-pressed={app.prefs.scheme === scheme} className="min-h-12 min-w-0 flex-1 basis-24 whitespace-normal rounded-xl border border-[var(--line)] bg-[var(--card)]" onClick={() => app.updatePrefs({ scheme })}>
                {t(`themes.${scheme}`)}
              </button>
            ))}
          </div>
          <div className={`grid gap-2 ${app.prefs.textSize >= 20 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {THEMES.filter((item) => item.id !== 'custom').map((item) => (
              <button key={item.id} type="button" aria-pressed={app.prefs.theme === item.id} className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-left" onClick={() => app.updatePrefs({ theme: item.id as ThemeId, accent: item.accent })}>
                <span aria-hidden className="h-6 w-6 shrink-0 rounded-full border border-black/20" style={{ background: item.accent }} />
                {t(item.labelKey)}
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

        <Section
          id="help"
          guide="settings-help"
          title={t('settings.sections.help')}
          summary={`${t(helpKey)} · ${t(`detail.${app.prefs.detail}`)}`}
          keywords={`${t('settings.helpPref')} ${t('settings.explain')} ${t('help.ai')} ${t('help.guide')} ${t('help.staff')} ${t('detail.short')} ${t('detail.full')}`}
          query={query}
          open={!!open.help}
          onToggle={toggle}
        >
          {([
            ['ai', 'help.ai'],
            ['guide', 'help.guide'],
            ['staff', 'help.staff'],
          ] as const).map(([id, key]) => (
            <label key={id} className="mb-2 flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3">
              <input type="radio" name="helpPref" checked={app.prefs.helpPreference === id} onChange={() => app.updatePrefs({ helpPreference: id as HelpPreference })} />
              {t(key)}
            </label>
          ))}
          <p className="mb-2 mt-3 font-semibold">{t('settings.explain')}</p>
          {(['short', 'full'] as const).map((detail) => (
            <label key={detail} className="mb-2 flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--card)] px-3">
              <input type="radio" name="detail" checked={app.prefs.detail === detail} onChange={() => app.updatePrefs({ detail })} />
              {t(`detail.${detail}`)}
            </label>
          ))}
        </Section>

        <Section
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

        <Section
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

        <Section
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
