import type { Preferences } from './types'
import type { TourProgressMap } from './tourProgress'

export const JOURNEY_TOUR_IDS = [
  'paynow',
  'transfer',
  'overseas',
  'bill',
  'scan',
  'giro',
  'goal',
  'card-lock',
] as const

export function recommendedTourIds(prefs: Preferences): string[] {
  const scores = new Map<string, number>()
  const bump = (id: string, weight: number) => scores.set(id, (scores.get(id) || 0) + weight)

  bump('home', 2)
  bump('paynow', 2)
  bump('transfer', 1)

  if (prefs.helpPreference === 'guide') {
    bump('home', 3)
    bump('settings', 2)
    bump('insights', 2)
  }
  if (prefs.helpPreference === 'ai') bump('paynow', 3)
  if (prefs.helpPreference === 'staff') bump('card-lock', 1)
  if (prefs.readAloud) bump('settings', 4)
  if (prefs.shortcuts.includes('paynow')) bump('paynow', 2)
  if (prefs.shortcuts.includes('scan')) bump('scan', 2)
  if (prefs.shortcuts.includes('transfer')) bump('transfer', 2)
  if (prefs.shortcuts.includes('insights')) bump('insights', 2)
  if (prefs.voiceTransferLimit > 0) bump('transfer', 1)
  if (prefs.easierTapping || prefs.textSize >= 20) bump('settings', 1)

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 3)
}

export function nextPracticeJourney(prefs: Preferences, progress: TourProgressMap, currentFlowId: string): string | null {
  const preferred = recommendedTourIds(prefs)
  const queue = [...preferred, ...JOURNEY_TOUR_IDS.filter((id) => !preferred.includes(id))]
  return queue.find((id) => id !== currentFlowId && !progress[id]?.completedPractice) || null
}