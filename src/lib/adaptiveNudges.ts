import { recommendedTourIds } from './recommendedTours'
import type { Preferences } from './types'

export type NudgeKind = 'showHow' | 'biggerText' | 'easierTap' | 'tourSuggest'

export interface ActiveNudge {
  kind: NudgeKind
  tourId?: string
}

const prefix = 'ocbc-nudge-'

interface NudgeState {
  validationFails: number
  speakTaps: number
  flowBacks: number
  dismissed: Partial<Record<NudgeKind, number>>
}

function load(userId: string): NudgeState {
  try {
    const raw = sessionStorage.getItem(prefix + userId)
    const empty = { validationFails: 0, speakTaps: 0, flowBacks: 0, dismissed: {} as NudgeState['dismissed'] }
    return raw ? { ...empty, ...(JSON.parse(raw) as NudgeState) } : empty
  } catch {
    return { validationFails: 0, speakTaps: 0, flowBacks: 0, dismissed: {} }
  }
}

function save(userId: string, state: NudgeState) {
  sessionStorage.setItem(prefix + userId, JSON.stringify(state))
}

function dismissedRecently(state: NudgeState, kind: NudgeKind) {
  const when = state.dismissed[kind]
  return when != null && Date.now() - when < 30 * 60_000
}

export function recordValidationFail(userId: string) {
  const state = load(userId)
  state.validationFails += 1
  save(userId, state)
}

export function recordSpeakTap(userId: string) {
  const state = load(userId)
  state.speakTaps += 1
  save(userId, state)
}

export function recordFlowBack(userId: string) {
  const state = load(userId)
  state.flowBacks += 1
  save(userId, state)
}

export function dismissNudge(userId: string, kind: NudgeKind) {
  const state = load(userId)
  state.dismissed[kind] = Date.now()
  if (kind === 'showHow') state.validationFails = 0
  if (kind === 'biggerText') state.speakTaps = 0
  if (kind === 'easierTap') state.flowBacks = 0
  save(userId, state)
}

export function peekNudge(userId: string, prefs: Preferences): ActiveNudge | null {
  const state = load(userId)
  if (state.validationFails >= 2 && !dismissedRecently(state, 'showHow')) {
    return { kind: 'showHow' }
  }
  if (state.speakTaps >= 3 && prefs.textSize < 22 && !dismissedRecently(state, 'biggerText')) {
    return { kind: 'biggerText' }
  }
  if (state.flowBacks >= 2 && !prefs.easierTapping && !dismissedRecently(state, 'easierTap')) {
    return { kind: 'easierTap' }
  }
  if (state.flowBacks >= 2 && prefs.helpPreference === 'guide' && !dismissedRecently(state, 'tourSuggest')) {
    const tourId = recommendedTourIds(prefs)[0]
    if (tourId) return { kind: 'tourSuggest', tourId }
  }
  return null
}