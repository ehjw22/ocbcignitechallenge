import { defaultPrefs } from '@/lib/storage'
import type { Preferences, Profile } from '@/lib/types'

export interface Persona {
  id: 'mei' | 'arif'
  prefs: Preferences
  profile: Profile
}

const meiPrefs: Preferences = {
  ...defaultPrefs(),
  language: 'zh',
  textSize: 22,
  boldText: true,
  detail: 'short',
  readAloud: true,
  speechRate: 0.9,
  helpPreference: 'staff',
  onboarded: true,
}

const arifPrefs: Preferences = {
  ...defaultPrefs(),
  language: 'en',
  textSize: 16,
  detail: 'full',
  helpPreference: 'ai',
  theme: 'ocean',
  accent: '#0B4F9E',
  shortcuts: ['giro', 'transfer', 'investments', 'goals', 'bills', 'scan'],
  spendingInsights: true,
  onboarded: true,
}

export const PERSONAS: Persona[] = [
  {
    id: 'mei',
    prefs: meiPrefs,
    profile: { id: 'mei', name: 'Tan Mei Ling', shortName: 'Mei', usualTransfer: 200 },
  },
  {
    id: 'arif',
    prefs: arifPrefs,
    profile: { id: 'arif', name: 'Arif Rahman', shortName: 'Arif', usualTransfer: 400 },
  },
]
