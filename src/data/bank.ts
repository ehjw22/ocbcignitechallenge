import type { Account, CardItem, Txn } from '@/lib/types'

export const ACCOUNTS: Account[] = [
  { id: '360', nameKey: 'accounts.a360', number: '9012345671', balance: 12480.22, kind: 'deposit' },
  { id: 'savings', nameKey: 'accounts.savings', number: '9018765432', balance: 3200, kind: 'deposit' },
  { id: 'card', nameKey: 'accounts.card365', number: '4412', balance: 640.15, kind: 'card' },
]

export const SEED_CARDS: CardItem[] = [
  { id: 'debit', nameKey: 'cards.debit', last4: '2291', locked: false },
  { id: 'credit', nameKey: 'cards.credit', last4: '4412', locked: false },
]

export const SEED_TXNS: Txn[] = [
  { id: 't1', title: 'NTUC FairPrice', amount: -42.3, date: '2026-10-21', accountId: '360' },
  { id: 't2', title: 'Salary', amount: 4200, date: '2026-10-20', accountId: '360' },
  { id: 't3', title: 'Grab', amount: -18.5, date: '2026-10-19', accountId: '360' },
  { id: 't4', title: 'SP Group', amount: -96.4, date: '2026-10-15', accountId: 'savings' },
]

export const SPENDING = [
  { key: 'food', amount: 420 },
  { key: 'transport', amount: 180 },
  { key: 'shopping', amount: 260 },
  { key: 'bills', amount: 540 },
  { key: 'other', amount: 90 },
]

export const PAYNOW_DIRECTORY: Record<string, string> = {
  '81234567': 'Siti Aminah',
  '91234567': 'Tan Wei Ming',
  '92345678': 'Lim Jia Hui',
}

const NRIC = /^[STFGM]\d{7}[A-Z]$/
const MOBILE = /^[89]\d{7}$/
const UEN = /^(\d{8}[A-Z]|\d{9}[A-Z]|[TSR]\d{2}[A-Z]{2}\d{4}[A-Z])$/
export function maskPayee(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.map((part, index) => {
    const letters = part.replace(/[^A-Za-z]/g, '')
    if (!letters) return part
    if (index === 0) return letters.toUpperCase()
    return `${letters[0].toUpperCase()}${'*'.repeat(Math.max(2, letters.length - 1))}`
  }).join(' ')
}

export function lookupPaynow(raw: string, proxy = 'mobile') {
  const value = raw.replace(/\s/g, '').replace(/^\+65/i, '').toUpperCase()
  if (!value) return { status: 'empty' as const }
  const ok = proxy === 'nric' ? NRIC.test(value) : proxy === 'uen' ? UEN.test(value) : MOBILE.test(value)
  if (!ok) return { status: 'bad' as const }
  const known = PAYNOW_DIRECTORY[value]
  if (!known) return { status: 'unknown' as const }
  return { status: 'ok' as const, name: maskPayee(known) }
}

export function payeeName(title: string | undefined) {
  const value = title || ''
  const key = value.replace(/\s/g, '')
  return PAYNOW_DIRECTORY[key] || value
}

export const NOTIFICATIONS = [
  { id: 'n1', title: 'notifications.salaryTitle', body: 'notifications.salaryBody', date: '2026-10-20' },
  { id: 'n2', title: 'notifications.billTitle', body: 'notifications.billBody', date: '2026-10-15' },
  { id: 'n3', title: 'notifications.securityTitle', body: 'notifications.securityBody', date: '2026-10-12' },
]

export const FX: Record<string, { currencyKey: string; perSgd: number; fee: number; account: 'au' | 'iban' | 'my' | 'uk' }> = {
  Australia: { currencyKey: 'fx.aud', perSgd: 1.1, fee: 5, account: 'au' },
  Malaysia: { currencyKey: 'fx.myr', perSgd: 3.45, fee: 5, account: 'my' },
  'United Kingdom': { currencyKey: 'fx.gbp', perSgd: 0.58, fee: 8, account: 'uk' },
  Germany: { currencyKey: 'fx.eur', perSgd: 0.68, fee: 8, account: 'iban' },
}

export const BILLERS = ['SP Group', 'Singtel', 'PUB', 'Town Council']

export function chartPalette(cvd: string) {
  if (cvd === 'monochrome') return ['#3f3f46', '#71717a', '#a1a1aa', '#52525b', '#d4d4d8', '#27272a']
  if (cvd === 'tritanopia') return ['#0f766e', '#be185d', '#c2410c', '#1d4ed8', '#a16207', '#4b5563']
  if (cvd === 'protanopia' || cvd === 'deuteranopia') return ['#0072B2', '#E69F00', '#332288', '#56B4E9', '#CC79A7', '#000000']
  return ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#332288', '#56B4E9']
}
