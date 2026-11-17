import { FX, lookupPaynow } from '../data/bank.ts'
import { parseAmount } from './format.ts'

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
  const value = parseAmount(raw)
  if (value == null) return issue(field, 'amount_format')
  if (value <= 0) return issue(field, 'amount_positive', { amount: 'S$0.00' })
  return null
}

export function validateForm(flowId: string, form: Record<string, string>, balance: number, payees: { name?: string; country?: string; account?: string }[] = []): Issue[] {
  const issues: Issue[] = []
  const need = (field: string, ok: boolean, code = 'required') => {
    if (!ok) issues.push(issue(field, code, { field }))
  }

  if (flowId === 'paynow' || flowId === 'topup') {
    const found = lookupPaynow(form.to || '', form.proxy || 'mobile')
    if (flowId === 'paynow' && found.status !== 'ok') {
      issues.push(issue('to', form.proxy === 'nric' ? 'nric' : form.proxy === 'uen' ? 'uen' : 'paynow_mobile'))
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
    if (form.when === 'later' && !form.laterDate?.trim()) need('laterDate', false)
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
    const value = parseAmount(form.amount || '')
    if (value == null || value < 100 || value > 50000) issues.push(issue('amount', 'limit_range'))
  }

  const payment = ['paynow', 'topup', 'transfer', 'overseas', 'bill', 'scan'].includes(flowId)
  const amount = parseAmount(form.amount || '')
  if (payment && amount != null && amount > balance) {
    issues.push(issue('amount', 'insufficient', { available: balance }))
  }

  return issues
}
