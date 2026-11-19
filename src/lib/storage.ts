import { DEMO_LOGINS } from '@/data/demoAccounts'
import type { AnalyticsEvent, CardItem, DemoUser, Preferences, Profile, StaffRequest, Txn } from './types'
import { DEFAULT_SHORTCUTS, sanitizeShortcuts } from './languages'
import { snapRate } from './rates'
import { clampVoiceTransferLimit, VOICE_TRANSFER_LIMIT_SGD } from './voiceTransfer'
import { normalizeLetterSpacing, normalizeLineHeight } from './readingComfort'

export const defaultPrefs = (): Preferences => ({
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
  shortcuts: [...DEFAULT_SHORTCUTS],
  dialect: 'standard',
  spendingInsights: false,
  onboarded: false,
  quizCompleted: false,
  dyslexiaFont: false,
  letterSpacing: 'normal',
  lineHeight: 'normal',
  readingRuler: false,
  easierTapping: false,
  voiceTransferLimit: VOICE_TRANSFER_LIMIT_SGD,
  voiceTransferConfirm: 'faceId',
})

export const defaultProfile = (): Profile => ({
  id: 'alex',
  name: 'Alex Tan',
  shortName: 'Alex',
  usualTransfer: 500,
})

export const APP_SEED_VERSION = 3
const SEED_VERSION_KEY = 'ocbc-adaptive-seed-version'

const keys = {
  prefs: 'ocbc-adaptive-prefs',
  profile: 'ocbc-adaptive-profile',
  events: 'ocbc-adaptive-events',
  requests: 'ocbc-adaptive-requests',
  txns: 'ocbc-adaptive-txns',
  cards: 'ocbc-adaptive-cards',
  balances: 'ocbc-adaptive-balances',
  limit: 'ocbc-adaptive-limit',
  tour: 'ocbc-adaptive-tour',
  users: 'ocbc-adaptive-users',
  guest: 'ocbc-guest-display',
  session: 'ocbc-adaptive-session',
  lastUser: 'ocbc-last-user',
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...(fallback as object), ...JSON.parse(raw) } as T
  } catch {
    return fallback
  }
}

export function loadPrefs(): Preferences {
  const base = defaultPrefs()
  const saved = read<Preferences>(keys.prefs, base)
  const cleanedShortcuts = sanitizeShortcuts(saved.shortcuts)
  const shortcutsChanged = JSON.stringify(cleanedShortcuts) !== JSON.stringify(saved.shortcuts)
  saved.shortcuts = cleanedShortcuts
  if (shortcutsChanged) savePrefs(saved)
  saved.textSize = Math.min(24, Math.max(16, Number(saved.textSize) || 16))
  saved.voiceTransferLimit = clampVoiceTransferLimit(saved.voiceTransferLimit)
  saved.voiceTransferConfirm = saved.voiceTransferConfirm === 'pin' ? 'pin' : 'faceId'
  saved.letterSpacing = normalizeLetterSpacing(saved.letterSpacing)
  saved.lineHeight = normalizeLineHeight(saved.lineHeight)
  saved.readingRuler = Boolean(saved.readingRuler)
  saved.quizCompleted = typeof saved.quizCompleted === 'boolean' ? saved.quizCompleted : Boolean(saved.onboarded)
  saved.onboarded = saved.quizCompleted
  return saved
}

export function savePrefs(prefs: Preferences) {
  const { backgroundImage, ...rest } = prefs
  try {
    localStorage.setItem(keys.prefs, JSON.stringify(prefs))
  } catch {
    localStorage.setItem(keys.prefs, JSON.stringify({ ...rest, backgroundImage: null, contrastWarning: true }))
  }
}

export function loadProfile(): Profile {
  return read(keys.profile, defaultProfile())
}

export function saveProfile(profile: Profile) {
  localStorage.setItem(keys.profile, JSON.stringify(profile))
}

export function loadEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(keys.events)
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : []
  } catch {
    return []
  }
}

export function saveEvents(events: AnalyticsEvent[]) {
  localStorage.setItem(keys.events, JSON.stringify(events.slice(-400)))
}

export function loadRequests(): StaffRequest[] {
  try {
    const raw = localStorage.getItem(keys.requests)
    return raw ? (JSON.parse(raw) as StaffRequest[]) : []
  } catch {
    return []
  }
}

export function saveRequests(requests: StaffRequest[]) {
  localStorage.setItem(keys.requests, JSON.stringify(requests))
}

const TICKET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function ticketRef() {
  let body = ''
  for (let i = 0; i < 7; i += 1) body += TICKET[Math.floor(Math.random() * TICKET.length)]
  return `OCBC-${body}`
}

export function loadExtraTxns(): Txn[] {
  try {
    const raw = localStorage.getItem(keys.txns)
    return raw ? (JSON.parse(raw) as Txn[]) : []
  } catch {
    return []
  }
}

export function saveExtraTxns(txns: Txn[]) {
  localStorage.setItem(keys.txns, JSON.stringify(txns.slice(0, 30)))
}

export function loadCards(seed: CardItem[]): CardItem[] {
  try {
    const raw = localStorage.getItem(keys.cards)
    if (!raw) return seed
    const saved = JSON.parse(raw) as CardItem[]
    return seed.map((card) => saved.find((s) => s.id === card.id) ?? card)
  } catch {
    return seed
  }
}

export function saveCards(cards: CardItem[]) {
  localStorage.setItem(keys.cards, JSON.stringify(cards))
}

export function loadBalances(seed: Record<string, number>) {
  try {
    const raw = localStorage.getItem(keys.balances)
    const balances = raw ? { ...seed, ...(JSON.parse(raw) as Record<string, number>) } : { ...seed }
    const version = Number(localStorage.getItem(SEED_VERSION_KEY) || '1')
    if (version < APP_SEED_VERSION) {
      for (const [accountId, target] of Object.entries(seed)) {
        if (typeof balances[accountId] === 'number') balances[accountId] = Math.max(balances[accountId], target)
      }
      saveBalances(balances)
      localStorage.setItem(SEED_VERSION_KEY, String(APP_SEED_VERSION))
    }
    return balances
  } catch {
    return seed
  }
}

export function saveBalances(balances: Record<string, number>) {
  localStorage.setItem(keys.balances, JSON.stringify(balances))
}

export function loadLimit(fallback = 5000) {
  const raw = localStorage.getItem(keys.limit)
  return raw ? Number(raw) : fallback
}

export function saveLimit(limit: number) {
  localStorage.setItem(keys.limit, String(limit))
}

export function tourSeen() {
  return localStorage.getItem(keys.tour) === '1'
}

export function setTourSeen() {
  localStorage.setItem(keys.tour, '1')
}

export function clearTourSeen() {
  localStorage.removeItem(keys.tour)
}

export type GuestDisplay = Pick<Preferences, 'language' | 'dialect' | 'textSize' | 'boldText' | 'scheme' | 'highContrast' | 'colourVision' | 'dyslexiaFont' | 'easierTapping'>

function mergePrefs(prefs: Preferences): Preferences {
  const next = { ...defaultPrefs(), ...prefs }
  next.shortcuts = sanitizeShortcuts(next.shortcuts)
  next.textSize = Math.min(24, Math.max(16, Number(next.textSize) || 16))
  next.speechRate = snapRate(Number(next.speechRate) || 1)
  next.quizCompleted = typeof next.quizCompleted === 'boolean' ? next.quizCompleted : Boolean(next.onboarded)
  next.onboarded = next.quizCompleted
  next.dyslexiaFont = Boolean(next.dyslexiaFont)
  next.letterSpacing = normalizeLetterSpacing(next.letterSpacing)
  next.lineHeight = normalizeLineHeight(next.lineHeight)
  next.readingRuler = Boolean(next.readingRuler)
  next.easierTapping = Boolean(next.easierTapping)
  next.voiceTransferLimit = clampVoiceTransferLimit(next.voiceTransferLimit)
  return next
}

export function loadGuest(): GuestDisplay {
  const base: GuestDisplay = {
    language: 'en',
    dialect: 'standard',
    textSize: 16,
    boldText: false,
    scheme: 'light',
    highContrast: false,
    colourVision: 'default',
    dyslexiaFont: false,
    easierTapping: false,
  }
  return read(keys.guest, base)
}

export function saveGuest(prefs: Preferences) {
  const guest: GuestDisplay = {
    language: prefs.language,
    dialect: prefs.language === 'zh' || prefs.language === 'zh-TW' ? prefs.dialect : 'standard',
    textSize: prefs.textSize,
    boldText: prefs.boldText,
    scheme: prefs.scheme,
    highContrast: prefs.highContrast,
    colourVision: prefs.colourVision,
    dyslexiaFont: prefs.dyslexiaFont,
    easierTapping: prefs.easierTapping,
  }
  localStorage.setItem(keys.guest, JSON.stringify(guest))
}

export function loadUsers(): DemoUser[] {
  try {
    const raw = localStorage.getItem(keys.users)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoUser[]
      if (Array.isArray(parsed)) return ensureDemoUsers(parsed.map((user) => ({ ...user, prefs: mergePrefs(user.prefs) })))
    }
  } catch {
    /* use migration below */
  }
  const prefs = loadPrefs()
  if (!prefs.onboarded) return ensureDemoUsers([])
  const profile = loadProfile()
  const user: DemoUser = {
    id: profile.id || 'alex',
    username: profile.shortName || 'Alex',
    prefs,
    profile,
  }
  return ensureDemoUsers([user])
}

function ensureDemoUsers(users: DemoUser[]) {
  const seedIds = new Set(DEMO_LOGINS.map((seed) => seed.id))
  const kept = users.filter((user) => !(seedIds.has(user.id) && !user.password))
  const next = kept.map((user) => {
    const clash = DEMO_LOGINS.some((seed) => seed.username.toLowerCase() === user.username.toLowerCase()) && !user.password
    return clash ? { ...user, username: `persona-${user.username}` } : user
  })
  let changed = next.length !== users.length || next.some((user, index) => user.username !== kept[index]?.username)
  for (const user of next) {
    const cleaned = sanitizeShortcuts(user.prefs?.shortcuts)
    if (JSON.stringify(cleaned) !== JSON.stringify(user.prefs?.shortcuts)) {
      user.prefs = { ...user.prefs, shortcuts: cleaned }
      changed = true
    }
  }
  for (const seed of DEMO_LOGINS) {
    if (!next.some((user) => user.username.toLowerCase() === seed.username.toLowerCase())) {
      next.push(seed)
      changed = true
    }
  }
  if (changed) saveUsers(next)
  return next
}

export function saveUsers(users: DemoUser[]) {
  localStorage.setItem(keys.users, JSON.stringify(users))
}

const AFTER_LOGIN = 'ocbc-after-login'

export function loadLastUser() {
  const id = localStorage.getItem(keys.lastUser)
  if (!id) return null
  return loadUsers().find((user) => user.id === id) || null
}

export function saveLastUserId(id: string | null) {
  if (id) localStorage.setItem(keys.lastUser, id)
  else localStorage.removeItem(keys.lastUser)
}

export function saveAfterLogin(path: string | null) {
  if (path && path.startsWith('/') && !path.startsWith('//')) sessionStorage.setItem(AFTER_LOGIN, path)
  else sessionStorage.removeItem(AFTER_LOGIN)
}

export function peekAfterLogin() {
  const path = sessionStorage.getItem(AFTER_LOGIN)
  return path && path.startsWith('/') && !path.startsWith('//') ? path : null
}

export function takeAfterLogin() {
  const path = peekAfterLogin()
  sessionStorage.removeItem(AFTER_LOGIN)
  return path
}

export function loadSessionId() {
  const id = sessionStorage.getItem(keys.session)
  if (!id) return null
  return loadUsers().some((user) => user.id === id) ? id : null
}

export function saveSessionId(id: string | null) {
  if (id) sessionStorage.setItem(keys.session, id)
  else sessionStorage.removeItem(keys.session)
}

export function resetAll() {
  Object.values(keys).forEach((key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  })
}
