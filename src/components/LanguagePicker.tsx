import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Choice } from '@/components/Choice'
import { CORE_LANGUAGES, PREVIEW_LANGUAGES, type LanguageOption } from '@/lib/languages'
import { translate } from '@/i18n'

const PREVIEW_NOTICE_KEY = 'ocbc-preview-lang-notice-dismissed'

export function previewLanguageNoticeNeeded(language: string) {
  if (!PREVIEW_LANGUAGES.some((item) => item.id === language)) return false
  try {
    return localStorage.getItem(PREVIEW_NOTICE_KEY) !== '1'
  } catch {
    return false
  }
}

export function dismissPreviewLanguageNotice() {
  try {
    localStorage.setItem(PREVIEW_NOTICE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function LanguagePicker({
  language,
  onPick,
  t,
  onPreviewPick,
}: {
  language: string
  onPick: (item: LanguageOption) => void
  t: (key: string) => string
  onPreviewPick?: (item: LanguageOption) => void
}) {
  const [params] = useSearchParams()
  const coreOnly = params.get('langs') === 'core'
  const [showPreview, setShowPreview] = useState(false)

  const pick = (item: LanguageOption) => {
    onPick(item)
    if (item.tier === 'preview' && previewLanguageNoticeNeeded(item.id)) onPreviewPick?.(item)
  }

  const row = (item: LanguageOption) => {
    const machineInUi = item.tier === 'preview' ? t('languages.machineNote') : ''
    const machineInLang = item.tier === 'preview' ? translate(item.id, 'languages.machineNote') : ''
    const machineEn = item.tier === 'preview' ? translate('en', 'languages.machineNote') : ''
    return (
      <Choice key={item.id} selected={language === item.id} onClick={() => pick(item)}>
        <span className="block font-semibold">{item.native}</span>
        <span className="block text-sm font-medium text-[var(--muted)]">{item.english}</span>
        {item.tier === 'preview' && (
          <span className="mt-1 block text-xs leading-snug text-[var(--muted)]">
            {machineInUi}
            {machineInLang && machineInLang !== machineInUi && (
              <span className="block">{machineInLang}</span>
            )}
            {machineEn && machineEn !== machineInUi && machineEn !== machineInLang && (
              <span className="block">{machineEn}</span>
            )}
          </span>
        )}
      </Choice>
    )
  }

  return (
    <div role="radiogroup" aria-label={t('onboarding.language')}>
      {CORE_LANGUAGES.map(row)}
      {!coreOnly && (
        <>
          {!showPreview && (
            <button type="button" className="mt-2 min-h-11 w-full text-left text-sm font-semibold text-[var(--link)] underline" onClick={() => setShowPreview(true)}>
              {t('languages.moreLanguages')}
            </button>
          )}
          {showPreview && PREVIEW_LANGUAGES.map(row)}
        </>
      )}
    </div>
  )
}