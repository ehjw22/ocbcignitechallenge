import type { CompareDemoId } from '@/lib/comparePersona'

export type CompareStepId =
  | 'home'
  | 'accounts'
  | 'paynow'
  | 'paynow-error'
  | 'ollie'
  | 'settings'

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
  { id: 'paynow-error', title: 'PayNow mistake', route: '/flow/paynow?practice=1&compare=unregistered' },
  { id: 'ollie', title: 'Ollie assistant', route: '/', openHelp: 'ai' },
  { id: 'settings', title: 'Settings & customisation', route: '/settings' },
]

const CALLOUTS: Record<CompareStepId, Record<CompareDemoId, CompareCallout[]>> = {
  home: {
    auntiemei: [
      { text: 'Bigger text and buttons — easier tapping turned on.' },
      { text: 'Simple home: three shortcuts, no spending insights (she opted out).' },
    ],
    arif: [
      { text: 'Dyslexia-friendly font with wider letter and line spacing.' },
      { text: 'Detailed home with spending insights card on screen.' },
    ],
  },
  accounts: {
    auntiemei: [
      { text: 'Balances only — no insights widgets (opted out).' },
      { text: 'Chinese labels with guided-help setup.' },
    ],
    arif: [
      { text: 'Spending snapshot on the accounts list.' },
      { text: 'Full transaction search and filters.' },
    ],
  },
  paynow: {
    auntiemei: [
      { text: 'Practice transfer — guided help is her default.' },
      { text: 'Larger type on the amount step.' },
    ],
    arif: [
      { text: 'Same PayNow journey in English, compact layout.' },
      { text: 'Open dyslexia font carries into the flow.' },
    ],
  },
  'paynow-error': {
    auntiemei: [
      { text: 'Clear red box + icon: says the number is not on PayNow.' },
      { text: 'Plain words on what to fix — in Chinese.' },
    ],
    arif: [
      { text: 'Same wrong number — compact inline error.' },
      { text: 'Standard styling, no guided error panel.' },
    ],
  },
  ollie: {
    auntiemei: [
      { text: 'She chose guided step-by-step help for journeys.' },
      { text: 'Read-aloud and Cantonese dialect in setup.' },
    ],
    arif: [
      { text: 'AI help opens straight from Home.' },
      { text: 'Full-detail answers with dyslexia-friendly text.' },
    ],
  },
  settings: {
    auntiemei: [
      { text: '20px text · simple layout · insights off · bigger taps.' },
      { text: 'Every option still available — presentation only.' },
    ],
    arif: [
      { text: 'Dyslexia font · extra spacing · insights on · full layout.' },
      { text: 'Same settings screens — different explicit choices.' },
    ],
  },
}

export function calloutsForStep(stepId: CompareStepId, demoId: CompareDemoId): CompareCallout[] {
  return CALLOUTS[stepId][demoId]
}