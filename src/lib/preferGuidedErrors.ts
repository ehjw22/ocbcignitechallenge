import type { HelpPreference, Preferences } from './types.ts'

export function preferGuidedErrors(prefs: Pick<Preferences, 'helpPreference'>): boolean {
  const help: HelpPreference = prefs.helpPreference
  return help === 'guide' || help === 'staff'
}