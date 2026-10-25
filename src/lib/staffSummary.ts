import { translate } from '@/i18n'
import { guideById } from '@/lib/guide'
import type { StaffRequest } from '@/lib/types'

export function staffSummary(
  lang: string,
  opts: { guideId: string; stepId: string; screen: string; question: string; seed: string },
) {
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)
  const parts: string[] = []
  if (opts.seed.trim()) parts.push(opts.seed.trim())
  const guide = opts.guideId ? guideById(opts.guideId) : undefined
  const title = guide ? t(guide.title) : ''
  if (guide && title && title !== guide.title) {
    const index = guide.steps.findIndex((step) => step.id === opts.stepId)
    parts.push(
      index >= 0
        ? t('staff.needStep', { task: title, step: index + 1, total: guide.steps.length })
        : t('staff.needTask', { task: title }),
    )
  }
  if (opts.question.trim()) parts.push(t('staff.lastQuestion', { question: opts.question.trim() }))
  if (!parts.length) parts.push(t('staff.needGeneral'))
  return parts.join(' ')
}

export function requestText(lang: string, request: Pick<StaffRequest, 'ref' | 'summary' | 'summaryEn'>) {
  const key = `staff.tickets.${request.ref}`
  const translated = translate(lang, key)
  if (translated !== key) return translated
  if (lang === 'en' && request.summaryEn) return request.summaryEn
  return request.summary
}
