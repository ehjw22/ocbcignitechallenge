import type { CompareDemoId } from '@/lib/comparePersona'

export type CompareStepId = 'home' | 'accounts' | 'paynow' | 'ollie' | 'settings'

export interface CompareStep {
  id: CompareStepId
  title: string
  route: string
  openHelp?: 'ai' | 'staff' | 'menu'
}

export interface CompareCallout {
  text: string
}

export const COMPARE_STEPS: CompareStep[] = [
  { id: 'home', title: 'Home', route: '/' },
  { id: 'accounts', title: 'Accounts & balance', route: '/accounts' },
  { id: 'paynow', title: 'PayNow (practice)', route: '/flow/paynow?practice=1' },
  { id: 'ollie', title: 'Ollie assistant', route: '/', openHelp: 'ai' },
  { id: 'settings', title: 'Settings & customisation', route: '/settings' },
]

const CALLOUTS: Record<CompareStepId, Record<CompareDemoId, CompareCallout[]>> = {
  home: {
    auntiemei: [
      { text: 'Home shortcuts match her setup — PayNow, overseas, and staff help stay one tap away.' },
      { text: 'Chinese UI with guided help and read-aloud turned on in setup.' },
    ],
    arif: [
      { text: 'Compact home layout shows fewer tiles so essentials stay in view.' },
      { text: 'Dark theme and spending insights match his FRANK-style preferences.' },
    ],
  },
  accounts: {
    auntiemei: [
      { text: 'Balances and labels follow her Chinese language setting end to end.' },
      { text: 'Her 360 account and overseas payees stay visible without extra digging.' },
    ],
    arif: [
      { text: 'Same data model — FRANK account — but copy stays in English.' },
      { text: 'Transaction list density follows the full-detail preference.' },
    ],
  },
  paynow: {
    auntiemei: [
      { text: 'Practice mode — no real payment — with guided help ready if she hesitates.' },
      { text: 'Labels and buttons use her Chinese UI; guided journeys can walk each field.' },
    ],
    arif: [
      { text: 'Same PayNow journey with a leaner field layout (short detail mode).' },
      { text: 'Ollie is the default help path instead of staff messaging.' },
    ],
  },
  ollie: {
    auntiemei: [
      { text: 'She chose guided help for transfers; Ollie still answers in Cantonese-friendly Chinese.' },
      { text: 'Voice and read-aloud settings carry into the assistant panel.' },
    ],
    arif: [
      { text: 'AI-first help opens straight on Home — no extra taps through a menu.' },
      { text: 'Suggested chips reflect his shortcuts (GIRO, goals, bills).' },
    ],
  },
  settings: {
    auntiemei: [
      { text: 'Language, speech, and help preference are explicit — never inferred.' },
      { text: 'Every payment and help option remains available; only presentation changes.' },
    ],
    arif: [
      { text: 'Theme, insights, and shortcut bar show what he opted into during setup.' },
      { text: 'Same settings screens as Auntie Mei — different choices, same access.' },
    ],
  },
}

export function calloutsForStep(stepId: CompareStepId, demoId: CompareDemoId): CompareCallout[] {
  return CALLOUTS[stepId][demoId]
}