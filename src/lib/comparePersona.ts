import { DEMO_LOGINS } from '../data/demoAccounts.ts'
import { languageById } from './languages.ts'
import type { HelpPreference, Preferences } from './types.ts'

export type CompareDemoId = 'auntiemei' | 'arif'

export const COMPARE_PERSONA_AGES: Record<CompareDemoId, number> = {
  auntiemei: 67,
  arif: 22,
}

const HELP_LABEL: Record<HelpPreference, string> = {
  ai: 'Ollie AI help',
  guide: 'Guided step-by-step help',
  staff: 'Message staff first',
}

export function compareDemoUser(id: CompareDemoId) {
  const user = DEMO_LOGINS.find((item) => item.id === id)
  if (!user) throw new Error(`Unknown compare demo: ${id}`)
  return user
}

export function personaCustomSummary(prefs: Preferences, languageLabel?: string): string {
  const lang = languageLabel ?? languageById(prefs.language).english
  const text = `${prefs.textSize}px text`
  const layout = prefs.detail === 'short' ? 'Simple home layout' : 'Full home layout'
  const help = HELP_LABEL[prefs.helpPreference]
  const extras: string[] = []
  if (prefs.readAloud) extras.push('Read aloud on')
  if (prefs.easierTapping) extras.push('Bigger buttons')
  if (prefs.dyslexiaFont) extras.push('Dyslexia-friendly font')
  if (prefs.letterSpacing !== 'normal' || prefs.lineHeight !== 'normal') extras.push('Extra reading spacing')
  if (prefs.scheme === 'dark') extras.push('Dark mode')
  if (prefs.spendingInsights) extras.push('Spending insights on')
  else extras.push('Spending insights off')
  if (prefs.dialect === 'cantonese' && (prefs.language === 'zh' || prefs.language === 'zh-TW')) {
    extras.push('Cantonese voice')
  }
  const tail = extras.length ? ` · ${extras.join(' · ')}` : ''
  return `${lang} · ${text} · ${layout} · ${help}${tail}`
}