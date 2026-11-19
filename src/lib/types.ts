export type ColourVision = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome'
export type DetailLevel = 'short' | 'full'
export type HelpPreference = 'ai' | 'guide' | 'staff'
export type Scheme = 'light' | 'dark'
export type Dialect = 'standard' | 'cantonese' | 'hokkien' | 'teochew' | 'hakka'
export type ThemeId = 'ocbc' | 'ocean' | 'forest' | 'sunset' | 'plum' | 'custom'
export type ContactMethod = 'message' | 'phone' | 'email'
/** How Ollie chat/voice transfers are confirmed after review (simulated demo auth). */
export type VoiceTransferConfirm = 'faceId' | 'pin'
export type RequestStatus = 'received' | 'in_progress' | 'replied'
export type LetterSpacingLevel = 'normal' | 'wider' | 'widest'
export type LineHeightLevel = 'normal' | 'roomy' | 'extraRoomy'

export interface Preferences {
  language: string
  textSize: number
  boldText: boolean
  highContrast: boolean
  colourVision: ColourVision
  detail: DetailLevel
  readAloud: boolean
  speechRate: number
  helpPreference: HelpPreference
  theme: ThemeId
  accent: string
  scheme: Scheme
  backgroundImage: string | null
  backgroundOverlay: number
  contrastWarning: boolean
  shortcuts: string[]
  dialect: Dialect
  spendingInsights: boolean
  onboarded: boolean
  quizCompleted: boolean
  dyslexiaFont: boolean
  letterSpacing: LetterSpacingLevel
  lineHeight: LineHeightLevel
  readingRuler: boolean
  easierTapping: boolean
  voiceTransferLimit: number
  voiceTransferConfirm: VoiceTransferConfirm
}

export interface DemoUser {
  id: string
  username: string
  password?: string
  prefs: Preferences
  profile: Profile
}

export interface Profile {
  id: string
  name: string
  shortName: string
  usualTransfer: number
}

export interface Account {
  id: string
  nameKey: string
  number: string
  balance: number
  kind: 'deposit' | 'card'
}

export interface Txn {
  id: string
  title: string
  amount: number
  date: string
  accountId: string
}

export interface CardItem {
  id: string
  nameKey: string
  last4: string
  locked: boolean
}

export interface StaffRequest {
  ref: string
  createdAt: string
  summary: string
  summaryEn?: string
  task: string
  step: string
  language: string
  method: ContactMethod
  time: string
  contact: string
  status: RequestStatus
  urgent: boolean
  customerName?: string
  userId?: string
  transcript?: string
  needs?: string
}

export interface AnalyticsEvent {
  id: string
  ts: string
  type: string
  data: Record<string, string | number | boolean | null>
}

export interface ChatAction {
  intent: 'paynow' | 'transfer' | 'overseas' | 'bill' | 'giro' | 'goal' | 'card-lock'
  fields: Record<string, string>
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  flags?: { refused?: boolean; escalated?: boolean; fraud?: boolean }
  source?: 'llm' | 'demo'
  journeyId?: string | null
  action?: ChatAction | null
  scamRisk?: 'none' | 'check' | 'high'
  suggestions?: string[]
  handover?: boolean
  voiceTransfer?: VoiceTransferCard
}

export interface ChatTransferReviewLine {
  payeeName: string
  payeeMasked: string
  fromAccountId: string
  amount: number
}

export interface VoiceTransferCard {
  kind:
    | 'confirm'
    | 'review'
    | 'scamQuiz'
    | 'sendReady'
    | 'authCancelled'
    | 'authFailed'
    | 'receipt'
    | 'transferError'
    | 'expired'
    | 'overLimit'
    | 'unknownPayee'
    | 'disabled'
    | 'uncaught'
    | 'suggestPayee'
    | 'choosePayee'
    | 'noMatchPayees'
    | 'askAmount'
  amount: number
  payeeName: string
  payeeId?: string
  payeeIds?: string[]
  query?: string
  flow?: 'paynow' | 'transfer' | 'overseas'
  fields?: Record<string, string>
  stuck?: boolean
  createdAt?: number
  practice?: boolean
  review?: ChatTransferReviewLine
  reference?: string
  receiptImage?: string
  receiptWhen?: string
  riskLevel?: 'check' | 'high'
  errorReason?: 'insufficient' | 'over_hard_cap' | 'bad_amount'
  available?: number
}
