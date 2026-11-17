import { lookupPaynow, PAYNOW_DIRECTORY } from '../data/bank.ts'
import type { SavedPayee } from '../data/demoAccounts.ts'
import { normaliseAmount } from './amount.ts'
import { validateForm } from './validate.ts'
import { wizardFields, wizardReview } from './flowWizard.ts'

const ALLOWED: Record<string, Set<string>> = {
  paynow: new Set(['proxy', 'to', 'amount', 'from', 'reference', 'savePayee', 'when', 'laterDate']),
  transfer: new Set(['name', 'bank', 'account', 'amount', 'from', 'savePayee', 'when', 'laterDate']),
  overseas: new Set(['country', 'name', 'swift', 'account', 'amount', 'from', 'purpose', 'note', 'reference', 'savePayee', 'when', 'laterDate']),
}

const ALIAS: Record<string, string> = {
  mobile: 'to',
  phone: 'to',
  number: 'to',
  proxyvalue: 'to',
  recipient: 'name',
  payee: 'name',
  payeename: 'name',
  accountnumber: 'account',
  value: 'amount',
  sgd: 'amount',
  amounts: 'amount',
  amountsgd: 'amount',
}

export type FillContext = {
  payees: SavedPayee[]
  depositIds: string[]
}

function resolveNamedPayee(name: string, payees: SavedPayee[]) {
  const hit = payees.find((payee) => payee.name.toLowerCase() === name.trim().toLowerCase()
    || payee.aliases?.some((alias) => alias.toLowerCase() === name.trim().toLowerCase()))
  return hit || null
}

function resolveMobilePayee(mobile: string) {
  const digits = mobile.replace(/\D/g, '').replace(/^65/, '')
  const label = PAYNOW_DIRECTORY[digits]
  return { to: digits, name: label || '' }
}

export function normaliseFillFields(flowId: string, fields: Record<string, string>, ctx: FillContext): Record<string, string> {
  const allowed = ALLOWED[flowId]
  if (!allowed) return {}
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue
    const mapped = ALIAS[key.toLowerCase()] || key
    if (!allowed.has(mapped)) continue
    next[mapped] = mapped === 'amount' ? normaliseAmount(value) : String(value).trim()
  }
  if (next.amount) next.amount = normaliseAmount(next.amount)
  if (flowId === 'paynow' && next.to && !next.proxy) next.proxy = 'mobile'
  const rawMobile = fields.mobile || fields.phone || fields.number || fields.proxyValue
  if (flowId === 'paynow' && rawMobile && !next.to) {
    const mobile = resolveMobilePayee(String(rawMobile))
    next.to = mobile.to
    if (!next.reference && mobile.name) next.reference = mobile.name
  }
  const nameGuess = next.name || fields.recipient || fields.payee || fields.payeeName
  if (nameGuess) {
    const saved = resolveNamedPayee(String(nameGuess), ctx.payees)
    if (saved) {
      next.name = saved.name
      if (flowId === 'paynow' && saved.account) {
        next.to = saved.account.replace(/\D/g, '').replace(/^65/, '')
        next.proxy = 'mobile'
      }
      if (flowId === 'transfer' && saved.account) next.account = saved.account
      if (flowId === 'overseas') {
        if (saved.country) next.country = saved.country
        if (saved.swift) next.swift = saved.swift
        if (saved.account) next.account = saved.account
      }
    }
  }
  if (flowId === 'paynow' && next.to) {
    const digits = next.to.replace(/\D/g, '').replace(/^65/, '')
    next.to = digits
    const known = PAYNOW_DIRECTORY[digits]
    if (known && lookupPaynow(digits, next.proxy || 'mobile').status === 'ok') {
      /* directory hit */
    }
  }
  if (!next.from && ctx.depositIds.length) next.from = ctx.depositIds[0]
  return next
}

export function firstFillWizardStep(
  flowId: string,
  form: Record<string, string>,
  balance: number,
  limit: number,
  payees: SavedPayee[],
) {
  const review = wizardReview(flowId)
  if (review < 0) return 0
  const issues = validateForm(flowId, form, balance, payees, limit)
  for (let step = 0; step < review; step += 1) {
    const ids = wizardFields(flowId, step) || []
    if (issues.some((issue) => ids.includes(issue.field))) return step
    if (flowId === 'paynow' && step === 1 && issues.some((issue) => issue.field === 'amount')) return step
  }
  return review
}