import type { SavedPayee } from '../data/demoAccounts.ts'
import { amountNumber, normaliseAmount } from './amount.ts'
import { assessTransferRisk, candidateKeys, loadRiskConfig } from './transferRisk.ts'
import { loadTransferHistory, recordTransfer } from './transferHistory.ts'
import { VOICE_TRANSFER_MAX_SGD, type VoiceMatch } from './voiceTransfer.ts'

function maskPayeeLabel(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.map((part, index) => {
    const letters = part.replace(/[^A-Za-z]/g, '')
    if (!letters) return part
    if (index === 0) return letters.toUpperCase()
    return `${letters[0].toUpperCase()}${'*'.repeat(Math.max(2, letters.length - 1))}`
  }).join(' ')
}

export type ChatTransferReview = {
  payeeName: string
  payeeMasked: string
  fromAccountId: string
  amount: number
  whenKey: 'flows.now'
}

export type ExecuteTransferInput = {
  match: VoiceMatch
  practice: boolean
  balances: Record<string, number>
  profileId: string
  payees: SavedPayee[]
  usualTransfer: number
  note?: string
}

export type ExecuteTransferOk = {
  ok: true
  reference: string
  fromAccountId: string
  amount: number
  payeeName: string
  newBalance: number
  practice: boolean
}

export type ExecuteTransferFail = {
  ok: false
  reason: 'insufficient' | 'over_hard_cap' | 'bad_amount'
  available?: number
}

export function buildChatReview(match: VoiceMatch): ChatTransferReview {
  const amount = amountNumber(match.fields.amount) || 0
  const name = match.payee.name
  const digits = (match.fields.to || match.fields.account || match.payee.account || '').replace(/\D/g, '')
  const masked = match.flow === 'paynow'
    ? (digits.length >= 4 ? `+65 ${digits.slice(0, 4)} ••••` : maskPayeeLabel(name))
    : maskPayeeLabel(name)
  return {
    payeeName: name,
    payeeMasked: masked,
    fromAccountId: match.fields.from || '',
    amount,
    whenKey: 'flows.now',
  }
}

export function assessChatRisk(match: VoiceMatch, payees: SavedPayee[], profileId: string, usualTransfer: number, text = '') {
  const amount = amountNumber(match.fields.amount) || 0
  const keys = candidateKeys(match.flow, match.fields)
  const history = loadTransferHistory(profileId)
  return assessTransferRisk({
    flowId: match.flow,
    amount,
    keys,
    payees,
    history,
    text,
    usualTransfer,
    config: loadRiskConfig(),
  })
}

function defaultDepositId(balances: Record<string, number>) {
  const first = Object.keys(balances).find((key) => (balances[key] ?? 0) > 0)
  return first || Object.keys(balances)[0] || ''
}

export function executeDemoTransfer(input: ExecuteTransferInput): ExecuteTransferOk | ExecuteTransferFail {
  const amount = amountNumber(input.match.fields.amount)
  if (amount == null || amount <= 0) return { ok: false, reason: 'bad_amount' }
  if (amount > VOICE_TRANSFER_MAX_SGD) return { ok: false, reason: 'over_hard_cap' }
  const from = input.match.fields.from || defaultDepositId(input.balances)
  const available = input.balances[from] ?? 0
  if (!input.practice && amount > available) return { ok: false, reason: 'insufficient', available }
  const reference = `DEMO-${Math.floor(100000 + Math.random() * 900000)}`
  if (!input.practice) {
    const keys = candidateKeys(input.match.flow, input.match.fields)
    if (keys[0]) recordTransfer({ userId: input.profileId, payeeKey: keys[0], amount, at: Date.now() })
  }
  const newBalance = input.practice ? available : Math.round((available - amount) * 100) / 100
  return {
    ok: true,
    reference,
    fromAccountId: from,
    amount,
    payeeName: input.match.payee.name,
    newBalance,
    practice: input.practice,
  }
}

export function transferExpired(createdAt: number, now = Date.now()) {
  return now - createdAt > 2 * 60 * 1000
}