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
  '91234567': 'Tan Wei Ming',
  '81234567': 'Siti Aminah',
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

export const FX: Record<string, { currencyKey: string; perSgd: number; fee: number; account: 'digits10' | 'iban' | 'my' }> = {
  Australia: { currencyKey: 'fx.aud', perSgd: 1.1, fee: 5, account: 'digits10' },
  Malaysia: { currencyKey: 'fx.myr', perSgd: 3.45, fee: 5, account: 'my' },
  'United Kingdom': { currencyKey: 'fx.gbp', perSgd: 0.58, fee: 8, account: 'iban' },
  Germany: { currencyKey: 'fx.eur', perSgd: 0.68, fee: 8, account: 'iban' },
}

export const BILLERS = ['SP Group', 'Singtel', 'PUB', 'Town Council']

export function chartPalette(cvd: string) {
  if (cvd === 'monochrome') return ['#111111', '#4b5563', '#9ca3af', '#1f2937', '#6b7280']
  if (cvd === 'tritanopia') return ['#9f1239', '#3f6212', '#111827', '#be123c', '#4b5563']
  return ['#0072B2', '#E69F00', '#CC79A7', '#332288', '#56B4E9']
}
