import type { Preferences } from './types'

export type PresetId = 'easyReading' | 'standard' | 'lowVision' | 'dyslexia'

const STANDARD: Preferences = {
  language: 'en',
  textSize: 16,
  boldText: false,
  highContrast: false,
  colourVision: 'default',
  detail: 'full',
  readAloud: false,
  speechRate: 1,
  helpPreference: 'ai',
  theme: 'ocbc',
  accent: '#E30613',
  scheme: 'light',
  backgroundImage: null,
  backgroundOverlay: 0.62,
  contrastWarning: false,
  shortcuts: ['transfer', 'paynow', 'bill'],
  dialect: 'standard',
  spendingInsights: false,
  onboarded: false,
  quizCompleted: false,
  dyslexiaFont: false,
  letterSpacing: 'normal',
  lineHeight: 'normal',
  readingRuler: false,
  easierTapping: false,
  voiceTransferLimit: 200,
  voiceTransferConfirm: 'faceId',
}

export const PRESET_PATCHES: Record<PresetId, Partial<Preferences>> = {
  easyReading: {
    textSize: 22,
    boldText: true,
    highContrast: true,
    easierTapping: true,
    readAloud: true,
    speechRate: 1,
    lineHeight: 'roomy',
    dyslexiaFont: false,
  },
  standard: {
    textSize: STANDARD.textSize,
    boldText: STANDARD.boldText,
    highContrast: STANDARD.highContrast,
    easierTapping: STANDARD.easierTapping,
    readAloud: STANDARD.readAloud,
    speechRate: STANDARD.speechRate,
    dyslexiaFont: STANDARD.dyslexiaFont,
  },
  lowVision: {
    textSize: 24,
    boldText: true,
    highContrast: true,
    readAloud: true,
    speechRate: 0.8,
    easierTapping: true,
    dyslexiaFont: false,
  },
  dyslexia: {
    dyslexiaFont: true,
    letterSpacing: 'wider',
    lineHeight: 'roomy',
    textSize: 20,
    readAloud: true,
    speechRate: 0.9,
    boldText: false,
    highContrast: false,
    easierTapping: true,
  },
}

export type PresetSnapshot = Pick<
  Preferences,
  'textSize' | 'boldText' | 'highContrast' | 'readAloud' | 'speechRate' | 'dyslexiaFont' | 'easierTapping'
>

export function snapshotPrefs(prefs: Preferences): PresetSnapshot {
  return {
    textSize: prefs.textSize,
    boldText: prefs.boldText,
    highContrast: prefs.highContrast,
    readAloud: prefs.readAloud,
    speechRate: prefs.speechRate,
    dyslexiaFont: prefs.dyslexiaFont,
    easierTapping: prefs.easierTapping,
  }
}

export function patchForPreset(id: PresetId) {
  return { ...PRESET_PATCHES[id] }
}