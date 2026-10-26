export interface LanguageOption {
  id: string
  native: string
  english: string
  official: boolean
  bcp47: string
  voicePrefix: string
}

export const LANGUAGES: LanguageOption[] = [
  { id: 'en', native: 'English', english: 'English', official: true, bcp47: 'en-SG', voicePrefix: 'en' },
  { id: 'zh', native: '中文', english: 'Chinese', official: true, bcp47: 'zh-CN', voicePrefix: 'zh-CN' },
  { id: 'ms', native: 'Bahasa Melayu', english: 'Malay', official: true, bcp47: 'ms-MY', voicePrefix: 'ms' },
  { id: 'ta', native: 'தமிழ்', english: 'Tamil', official: true, bcp47: 'ta-IN', voicePrefix: 'ta' },
  { id: 'zh-TW', native: '繁體中文', english: 'Traditional Chinese', official: false, bcp47: 'zh-TW', voicePrefix: 'zh-TW' },
  { id: 'id', native: 'Bahasa Indonesia', english: 'Indonesian', official: false, bcp47: 'id-ID', voicePrefix: 'id' },
  { id: 'vi', native: 'Tiếng Việt', english: 'Vietnamese', official: false, bcp47: 'vi-VN', voicePrefix: 'vi' },
  { id: 'th', native: 'ไทย', english: 'Thai', official: false, bcp47: 'th-TH', voicePrefix: 'th' },
  { id: 'tl', native: 'Tagalog', english: 'Tagalog', official: false, bcp47: 'fil-PH', voicePrefix: 'fil' },
  { id: 'ko', native: '한국어', english: 'Korean', official: false, bcp47: 'ko-KR', voicePrefix: 'ko' },
  { id: 'ja', native: '日本語', english: 'Japanese', official: false, bcp47: 'ja-JP', voicePrefix: 'ja' },
  { id: 'hi', native: 'हिन्दी', english: 'Hindi', official: false, bcp47: 'hi-IN', voicePrefix: 'hi' },
  { id: 'bn', native: 'বাংলা', english: 'Bengali', official: false, bcp47: 'bn-IN', voicePrefix: 'bn' },
]

export function languageById(id: string) {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0]
}

export const THEMES: { id: string; accent: string; labelKey: string }[] = [
  { id: 'ocbc', accent: '#C10512', labelKey: 'themes.ocbc' },
  { id: 'ocean', accent: '#0B4F9E', labelKey: 'themes.ocean' },
  { id: 'forest', accent: '#0F5C56', labelKey: 'themes.forest' },
  { id: 'sunset', accent: '#C2410C', labelKey: 'themes.sunset' },
  { id: 'plum', accent: '#6D28D9', labelKey: 'themes.plum' },
  { id: 'custom', accent: '#C10512', labelKey: 'themes.custom' },
]

export const SHORTCUTS = [
  'transfer',
  'paynow',
  'bills',
  'overseas',
  'scan',
  'cards',
  'goals',
  'giro',
  'topup',
  'investments',
  'insurance',
  'rewards',
  'staff',
  'accounts',
  'help',
  'insights',
] as const

export const DEFAULT_SHORTCUTS = ['transfer', 'paynow', 'bills', 'scan', 'cards', 'rewards']

export const DIALECTS: { id: string; ready: boolean }[] = [
  { id: 'standard', ready: true },
  { id: 'cantonese', ready: true },
  { id: 'hokkien', ready: false },
  { id: 'teochew', ready: false },
  { id: 'hakka', ready: false },
]
