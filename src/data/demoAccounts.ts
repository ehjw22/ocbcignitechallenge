import { DEFAULT_SHORTCUTS } from '../lib/languages.ts'
import { VOICE_TRANSFER_LIMIT_SGD } from '../lib/voiceTransfer.ts'
import type { Account, DemoUser, Preferences, Profile, Txn } from '../lib/types.ts'

function basePrefs(): Preferences {
  return {
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
    easierTapping: false,
    voiceTransferLimit: VOICE_TRANSFER_LIMIT_SGD,
    voiceTransferConfirm: 'faceId',
  }
}

export interface SavedPayee {
  id: string
  label: string
  name: string
  country: string
  swift?: string
  account?: string
  key?: string
  aliases?: string[]
}

export const DEMO_PAYEE_JOHN: SavedPayee = {
  id: 'john',
  label: 'John Tan',
  name: 'John Tan',
  country: 'Singapore',
  account: '91234567',
  key: 'paynow:91234567',
  aliases: ['John', 'Jon', '约翰', '約翰'],
}

export interface DemoGoal {
  id: string
  name: string
  target: number
  monthly: number
  saved?: number
}

export const DEMO_SEED_VERSION = 3

export interface BankBook {
  accounts: Account[]
  balances: Record<string, number>
  txns: Txn[]
  goals: DemoGoal[]
  payees: SavedPayee[]
  seedVersion?: number
}

const meiPrefs: Preferences = {
  ...basePrefs(),
  language: 'zh',
  dialect: 'cantonese',
  textSize: 16,
  detail: 'full',
  helpPreference: 'guide',
  readAloud: true,
  speechRate: 0.8,
  shortcuts: ['overseas', 'paynow', 'staff', 'accounts', 'help', 'scan'],
  quizCompleted: true,
  onboarded: true,
}

const arifPrefs: Preferences = {
  ...basePrefs(),
  language: 'en',
  textSize: 16,
  detail: 'short',
  helpPreference: 'ai',
  speechRate: 1,
  scheme: 'dark',
  spendingInsights: true,
  shortcuts: ['transfer', 'paynow', 'bill', 'scan', 'goals', 'insights'],
  quizCompleted: true,
  onboarded: true,
}

const meiProfile: Profile = { id: 'auntiemei', name: 'Auntie Mei', shortName: 'Auntie Mei', usualTransfer: 200 }
const arifProfile: Profile = { id: 'arif', name: 'Arif', shortName: 'Arif', usualTransfer: 80 }

export const DEMO_LOGINS: DemoUser[] = [
  { id: 'auntiemei', username: 'auntiemei', password: 'demo1234', prefs: meiPrefs, profile: meiProfile },
  { id: 'arif', username: 'arif', password: 'demo1234', prefs: arifPrefs, profile: arifProfile },
]

const arifTxns: Txn[] = [
  { id: 'arif-1', title: 'Hawker stall', amount: -6.5, date: '2026-10-22', accountId: 'frank' },
  { id: 'arif-2', title: 'Grab', amount: -12.4, date: '2026-10-18', accountId: 'frank' },
  { id: 'arif-3', title: 'Netflix', amount: -15.98, date: '2026-10-12', accountId: 'frank' },
  { id: 'arif-4', title: 'Allowance', amount: 400, date: '2026-10-01', accountId: 'frank' },
  { id: 'arif-5', title: 'Kopitiam', amount: -8.2, date: '2026-09-20', accountId: 'frank' },
  { id: 'arif-6', title: 'Bus and MRT', amount: -42, date: '2026-09-15', accountId: 'frank' },
  { id: 'arif-7', title: 'Spotify', amount: -9.98, date: '2026-09-12', accountId: 'frank' },
  { id: 'arif-8', title: 'Allowance', amount: 400, date: '2026-09-01', accountId: 'frank' },
  { id: 'arif-9', title: 'Food court', amount: -11.3, date: '2026-08-21', accountId: 'frank' },
  { id: 'arif-10', title: 'Grab', amount: -14.6, date: '2026-08-16', accountId: 'frank' },
  { id: 'arif-11', title: 'YouTube Premium', amount: -11.98, date: '2026-08-12', accountId: 'frank' },
  { id: 'arif-12', title: 'Allowance', amount: 400, date: '2026-08-01', accountId: 'frank' },
]

const books: Record<string, BankBook> = {
  auntiemei: {
    accounts: [{ id: '360', nameKey: 'accounts.a360', number: '9012345671', balance: 100000, kind: 'deposit' }],
    balances: { '360': 100000 },
    seedVersion: DEMO_SEED_VERSION,
    txns: [
      { id: 'mei-1', title: 'NTUC FairPrice', amount: -42.3, date: '2026-11-02', accountId: '360' },
      { id: 'mei-2', title: 'Tan Wei Ming', amount: -80, date: '2026-11-01', accountId: '360' },
      { id: 'mei-3', title: 'Allowance', amount: 500, date: '2026-10-28', accountId: '360' },
      { id: 'mei-4', title: 'Kopitiam', amount: -6.5, date: '2026-10-20', accountId: '360' },
      { id: 'mei-5', title: 'SP Group', amount: -86.4, date: '2026-10-12', accountId: '360' },
      { id: 'mei-6', title: 'Grab', amount: -14.2, date: '2026-09-18', accountId: '360' },
    ],
    goals: [],
    payees: [
      DEMO_PAYEE_JOHN,
      { id: 'wei', label: 'Son - Wei Ming (Australia)', name: 'Tan Wei Ming', country: 'Australia', swift: 'CTBAAU2S', account: '12345678', aliases: ['son', '儿子', '兒子', 'anak lelaki'] },
    ],
  },
  arif: {
    accounts: [{ id: 'frank', nameKey: 'accounts.frank', number: '5011223344', balance: 100000, kind: 'deposit' }],
    balances: { frank: 100000 },
    seedVersion: DEMO_SEED_VERSION,
    txns: arifTxns,
    goals: [{ id: 'laptop', name: 'Laptop', target: 1500, monthly: 100, saved: 400 }],
    payees: [
      DEMO_PAYEE_JOHN,
      { id: 'siti', label: 'Siti Aminah', name: 'Siti Aminah', country: 'Singapore', account: '81234567', key: 'paynow:81234567' },
    ],
  },
}

export function isDemoAccount(id: string) {
  return id === 'persona-mei' || id === 'persona-arif' || id in books
}

export function demoBook(id: string) {
  if (id === 'persona-mei') return books.auntiemei
  if (id === 'persona-arif') return books.arif
  return books[id]
}

const BOOK_PREFIX = 'ocbc-bank-'

export function mergeSeedPayees(saved: SavedPayee[], seed: SavedPayee[]): SavedPayee[] {
  const map = new Map<string, SavedPayee>()
  for (const payee of saved) map.set(payee.id, payee)
  for (const seedPayee of seed) {
    const current = map.get(seedPayee.id)
    if (!current) {
      map.set(seedPayee.id, seedPayee)
      continue
    }
    const aliases = [...new Set([...(seedPayee.aliases || []), ...(current.aliases || [])])]
    map.set(seedPayee.id, {
      ...seedPayee,
      ...current,
      swift: current.swift || seedPayee.swift,
      account: current.account || seedPayee.account,
      key: current.key || seedPayee.key,
      aliases,
    })
  }
  const ordered: SavedPayee[] = []
  for (const seedPayee of seed) {
    const item = map.get(seedPayee.id)
    if (item) ordered.push(item)
  }
  for (const payee of saved) {
    if (!seed.some((item) => item.id === payee.id)) ordered.push(map.get(payee.id) || payee)
  }
  return ordered
}

export function migrateBalances(saved: BankBook, seed: BankBook): BankBook {
  const version = saved.seedVersion ?? 1
  if (version >= DEMO_SEED_VERSION) return saved
  const balances = { ...saved.balances }
  const accounts = saved.accounts.map((account) => {
    const target = seed.balances[account.id] ?? account.balance
    const nextBal = Math.max(balances[account.id] ?? account.balance, target)
    balances[account.id] = nextBal
    return account.kind === 'deposit' ? { ...account, balance: nextBal } : account
  })
  return { ...saved, balances, accounts, seedVersion: DEMO_SEED_VERSION }
}

export function resolveBook(id: string): BankBook | null {
  const seed = demoBook(id)
  if (!seed) return null
  const saved = loadBook(id)
  if (!saved) return { ...seed, payees: [...seed.payees] }
  const payees = mergeSeedPayees(saved.payees || [], seed.payees)
  const savedSnapshot: BankBook = { ...saved, payees }
  const migrated = migrateBalances(savedSnapshot, seed)
  const book: BankBook = {
    ...seed,
    ...saved,
    payees,
    accounts: migrated.accounts,
    balances: migrated.balances,
    seedVersion: migrated.seedVersion,
    txns: saved.txns ?? seed.txns,
    goals: saved.goals ?? seed.goals,
  }
  const savedVersion = saved.seedVersion ?? 1
  const topped = Object.keys(migrated.balances).some((key) => (migrated.balances[key] ?? 0) > (saved.balances?.[key] ?? 0))
  if (savedVersion < DEMO_SEED_VERSION || topped || JSON.stringify(saved.payees) !== JSON.stringify(payees)) {
    saveBook(id, book)
  }
  return book
}

export function loadBook(id: string): BankBook | null {
  try {
    const raw = localStorage.getItem(BOOK_PREFIX + id)
    return raw ? (JSON.parse(raw) as BankBook) : null
  } catch {
    return null
  }
}

export function saveBook(id: string, book: BankBook) {
  localStorage.setItem(BOOK_PREFIX + id, JSON.stringify(book))
}

export function clearBooks() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(BOOK_PREFIX)) localStorage.removeItem(key)
  }
}
