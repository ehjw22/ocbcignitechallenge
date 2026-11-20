import { FX, lookupPaynow } from '../data/bank.ts'
import { amountNumber, normaliseAmount } from './amount.ts'

export interface Issue {
  field: string
  code: string
  params?: Record<string, string | number>
}

const SWIFT = /^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/

function issue(field: string, code: string, params?: Record<string, string | number>): Issue {
  return { field, code, params }
}

function amountIssue(field: string, raw: string | undefined): Issue | null {
  if (!raw || !raw.trim()) return issue(field, 'amount_positive')
  const normal = normaliseAmount(raw)
  if (!normal) return issue(field, 'amount_format')
  const value = amountNumber(normal)
  if (value == null || value <= 0) return issue(field, 'amount_positive', { amount: 'S$0.00' })
  return null
}

function isoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Scheduled ("Later") payments: from tomorrow up to one year ahead, as YYYY-MM-DD (local time).
export function laterDateBounds(now = new Date()) {
  const min = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const max = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
  return { min: isoDay(min), max: isoDay(max) }
}

export function laterDateIssue(raw: string, now = new Date()): 'date_format' | 'date_range' | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim())
  if (!match) return 'date_format'
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return 'date_format'
  const { min, max } = laterDateBounds(now)
  const value = isoDay(date)
  return value < min || value > max ? 'date_range' : null
}

export function validateForm(
  flowId: string,
  form: Record<string, string>,
  balance: number,
  payees: { name?: string; country?: string; account?: string }[] = [],
  dailyLimit = Infinity,
): Issue[] {
  const issues: Issue[] = []
  const need = (field: string, ok: boolean, code = 'required') => {
    if (!ok) issues.push(issue(field, code, { field }))
  }

  if (flowId === 'paynow' || flowId === 'topup') {
    const found = lookupPaynow(form.to || '', form.proxy || 'mobile')
    if (flowId === 'paynow' && found.status !== 'ok') {
      if (found.status === 'unknown') issues.push(issue('to', 'paynow_not_registered'))
      else issues.push(issue('to', form.proxy === 'nric' ? 'nric' : form.proxy === 'uen' ? 'uen' : 'paynow_mobile'))
    } else if (flowId === 'topup' && found.status !== 'ok') issues.push(issue('to', 'paynow_mobile'))
    const amount = amountIssue('amount', form.amount)
    if (amount) issues.push(amount)
  }

  if (flowId === 'transfer') {
    need('name', Boolean(form.name?.trim()))
    const digits = (form.account || '').replace(/\D/g, '')
    if (!form.account?.trim() || digits.length !== 10 || /\D/.test(form.account.replace(/\s/g, ''))) {
      issues.push(issue('account', 'account_digits', { got: digits.length }))
    }
    const amount = amountIssue('amount', form.amount)
    if (amount) issues.push(amount)
  }

  if (flowId === 'overseas') {
    need('country', Boolean(form.country && FX[form.country]))
    need('name', Boolean(form.name?.trim()))
    const spec = FX[form.country] || FX.Australia
    const raw = (form.account || '').replace(/\s/g, '')
    const digits = raw.replace(/\D/g, '')
    const savedAccount = payees.some((payee) => {
      const account = (payee.account || '').replace(/\s/g, '')
      if (!account || account !== raw) return false
      if (form.name && payee.name && payee.name.trim().toLowerCase() !== form.name.trim().toLowerCase()) return false
      if (form.country && payee.country && payee.country !== form.country) return false
      return true
    })
    if (!savedAccount && spec.account === 'iban') {
      if (!/^DE[A-Za-z0-9]{20}$/.test(raw)) issues.push(issue('account', 'account_iban'))
    } else if (!savedAccount && spec.account === 'my') {
      if (digits.length < 10 || digits.length > 16 || /\D/.test(raw)) issues.push(issue('account', 'account_my', { got: digits.length }))
    } else if (!savedAccount && spec.account === 'uk') {
      if (digits.length !== 8 || /\D/.test(raw)) issues.push(issue('account', 'account_uk', { got: digits.length }))
    } else if (!savedAccount && (digits.length < 6 || digits.length > 9 || /\D/.test(raw))) {
      issues.push(issue('account', 'account_au', { got: digits.length }))
    }
    const amount = amountIssue('amount', form.amount)
    if (amount) issues.push(amount)
  }

  // "Later" date for the flows that show it (PayNow hides scheduling, so it is not checked there).
  if (['transfer', 'overseas', 'bill'].includes(flowId) && form.when === 'later') {
    const raw = form.laterDate?.trim() || ''
    if (!raw) need('laterDate', false)
    else {
      const code = laterDateIssue(raw)
      if (code) issues.push(issue('laterDate', code))
    }
  }

  if (flowId === 'overseas' && (FX[form.country] || FX.Australia).account !== 'iban' && !SWIFT.test((form.swift || '').trim())) {
    issues.push(issue('swift', 'swift', { got: (form.swift || '').trim().length }))
  }

  if (flowId === 'bill') {
    need('biller', Boolean(form.biller))
    need('ref', Boolean(form.ref?.trim()))
    const amount = amountIssue('amount', form.amount)
    if (amount) issues.push(amount)
  }

  if (flowId === 'giro') {
    need('org', Boolean(form.org?.trim()))
    const limit = amountIssue('limit', form.limit)
    if (limit) issues.push(limit)
  }

  if (flowId === 'scan') {
    need('merchant', Boolean(form.merchant?.trim()))
    const amount = amountIssue('amount', form.amount)
    if (amount) issues.push(amount)
  }

  if (flowId === 'goal') {
    need('name', Boolean(form.name?.trim()))
    const target = amountIssue('target', form.target)
    if (target) issues.push({ ...target, code: target.code === 'amount_positive' ? 'goal_amount' : target.code })
  }

  if (flowId === 'limit') {
    const value = amountNumber(form.amount || '')
    if (value == null || value < 100 || value > 50000) issues.push(issue('amount', 'limit_range'))
  }

  const payment = ['paynow', 'topup', 'transfer', 'overseas', 'bill', 'scan'].includes(flowId)
  const amount = amountNumber(form.amount || '')
  if (payment && amount != null) {
    if (Number.isFinite(dailyLimit) && dailyLimit > 0 && amount > dailyLimit) {
      issues.push(issue('amount', 'daily_limit', { limit: dailyLimit }))
    } else if (amount > balance) {
      issues.push(issue('amount', 'insufficient', { available: balance }))
    }
  }

  return issues
}
