import { Choice } from '@/components/Choice'
import { Switch } from '@/components/Switch'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import type { LetterSpacingLevel, LineHeightLevel } from '@/lib/types'

const LETTER: { id: LetterSpacingLevel; key: string }[] = [
  { id: 'normal', key: 'settings.letterSpacingNormal' },
  { id: 'wider', key: 'settings.letterSpacingWider' },
  { id: 'widest', key: 'settings.letterSpacingWidest' },
]
const LINE: { id: LineHeightLevel; key: string }[] = [
  { id: 'normal', key: 'settings.lineHeightNormal' },
  { id: 'roomy', key: 'settings.lineHeightRoomy' },
  { id: 'extraRoomy', key: 'settings.lineHeightExtraRoomy' },
]

export function ReadingComfortControls({ headingId }: { headingId?: string }) {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)
  return (
  <div className="mt-4 border-t border-[var(--line)] pt-4">
    <h3 id={headingId} className="mb-3 text-base font-semibold">{t('settings.readingComfort')}</h3>
    <fieldset className="space-y-2">
      <legend className="mb-1 block text-sm font-semibold">{t('settings.letterSpacing')}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-labelledby={headingId}>
        {LETTER.map((level) => (
          <Choice
            key={level.id}
            selected={app.prefs.letterSpacing === level.id}
            onClick={() => app.updatePrefs({ letterSpacing: level.id })}
          >
            {t(level.key)}
          </Choice>
        ))}
      </div>
    </fieldset>
    <fieldset className="mt-4 space-y-2">
      <legend className="mb-1 block text-sm font-semibold">{t('settings.lineHeight')}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup">
        {LINE.map((level) => (
          <Choice
            key={level.id}
            selected={app.prefs.lineHeight === level.id}
            onClick={() => app.updatePrefs({ lineHeight: level.id })}
          >
            {t(level.key)}
          </Choice>
        ))}
      </div>
    </fieldset>
    <div className="mt-4 flex min-h-12 items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block font-semibold">{t('settings.readingRuler')}</span>
        <span className="block text-sm font-normal text-[var(--muted)]">{t('settings.readingRulerBody')}</span>
      </span>
      <Switch
        on={app.prefs.readingRuler}
        label={t('settings.readingRuler')}
        onChange={(next) => app.updatePrefs({ readingRuler: next })}
      />
    </div>
    <div className="mt-3 flex min-h-12 items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block font-semibold">{t('settings.dyslexiaFont')}</span>
        <span className="block text-sm font-normal text-[var(--muted)]">{t('settings.dyslexiaFontBody')}</span>
      </span>
      <Switch on={app.prefs.dyslexiaFont} label={t('settings.dyslexiaFont')} onChange={(next) => app.updatePrefs({ dyslexiaFont: next })} />
    </div>
  </div>
  )
}