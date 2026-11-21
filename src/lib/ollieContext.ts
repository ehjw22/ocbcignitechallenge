import { byCategory, rowsFor } from '../data/insights.ts'
import type { Account, Preferences, Txn } from './types'
import type { SavedPayee } from '@/data/demoAccounts'

export interface OllieContextPack {
  route: string
  screen: string
  step: string
  prefs: {
    language: string
    textSize: number
    boldText: boolean
    highContrast: boolean
    detail: Preferences['detail']
    readAloud: boolean
    helpPreference: Preferences['helpPreference']
    easierTapping: boolean
    spendingInsights: boolean
    letterSpacing: Preferences['letterSpacing']
    lineHeight: Preferences['lineHeight']
    readingRuler: boolean
    dyslexiaFont: boolean
  }
  payeeNames: string[]
  recentTxns: { title: string; amount: number; date: string }[]
  topCategories: { key: string; amount: number }[]
  fxRates: { country: string; rate: number; fee: number }[]
}

const FX_SAMPLE = [
  { country: 'Australia', rate: 1.1, fee: 5 },
  { country: 'Malaysia', rate: 3.45, fee: 5 },
  { country: 'UK', rate: 0.58, fee: 10 },
  { country: 'Germany', rate: 0.68, fee: 10 },
]

export function buildOllieContext(input: {
  pathname: string
  screen: string
  step: string
  prefs: Preferences
  payees: SavedPayee[]
  txns: Txn[]
  excluded: Set<string>
  accounts: Account[]
}): OllieContextPack {
  const month = '2026-10'
  const rows = rowsFor('all', month, input.excluded)
  const categories = [...byCategory(rows)]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4)
    .map((item) => ({ key: item.key, amount: Math.round(item.amount * 100) / 100 }))

  const recent = [...input.txns]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 5)
    .map((txn) => ({ title: txn.title, amount: txn.amount, date: txn.date }))

  return {
    route: input.pathname,
    screen: input.screen,
    step: input.step,
    prefs: {
      language: input.prefs.language,
      textSize: input.prefs.textSize,
      boldText: input.prefs.boldText,
      highContrast: input.prefs.highContrast,
      detail: input.prefs.detail,
      readAloud: input.prefs.readAloud,
      helpPreference: input.prefs.helpPreference,
      easierTapping: input.prefs.easierTapping,
      spendingInsights: input.prefs.spendingInsights,
      letterSpacing: input.prefs.letterSpacing,
      lineHeight: input.prefs.lineHeight,
      readingRuler: input.prefs.readingRuler,
      dyslexiaFont: input.prefs.dyslexiaFont,
    },
    payeeNames: input.payees.map((payee) => payee.name).slice(0, 12),
    recentTxns: recent,
    topCategories: categories,
    fxRates: FX_SAMPLE,
  }
}