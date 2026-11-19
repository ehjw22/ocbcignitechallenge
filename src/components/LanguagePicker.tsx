import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Choice } from '@/components/Choice'
import { CORE_LANGUAGES, PREVIEW_LANGUAGES, type LanguageOption } from '@/lib/languages'
import { translate } from '@/i18n'

export function LanguagePicker({
  language,
  onPick,
  t,
}: {
  language: string
  onPick: (item: LanguageOption) => void
  t: (key: string) => string
}) {
  const [params] = useSearchParams()
  const coreOnly = params.get('langs') === 'core'
  const [showPreview, setShowPreview] = useState(false)
  const previewOn = language && PREVIEW_LANGUAGES.some((item) => item.id === language)

  const row = (item: LanguageOption) => (
    <Choice key={item.id} selected={language === item.id} onClick={() => onPick(item)}>
      <span className="flex flex-wrap items-center gap-2">
        <span>{item.native}</span>
        {item.tier === 'preview' && (
          <span className="rounded-full bg-[var(--soft)] px-2 py-0.5 text-[11px] font-bold uppercase text-[var(--muted)]">{t('languages.previewPill')}</span>
        )}
      </span>
      {language === 'en' && item.id !== 'en' && <span className="block text-sm font-medium text-[var(--muted)]">{item.english}</span>}
    </Choice>
  )

  return (
    <div role="radiogroup" aria-label={t('onboarding.language')}>
      {CORE_LANGUAGES.map(row)}
      {!coreOnly && (
        <>
          {!showPreview && (
            <button type="button" className="mt-2 min-h-11 w-full text-left text-sm font-semibold text-[var(--link)] underline" onClick={() => setShowPreview(true)}>
              {t('languages.morePreview')}
            </button>
          )}
          {showPreview && PREVIEW_LANGUAGES.map(row)}
        </>
      )}
      {previewOn && <p className="mt-2 text-sm text-[var(--muted)]">{translate(language, 'languages.previewNote')}</p>}
    </div>
  )
}