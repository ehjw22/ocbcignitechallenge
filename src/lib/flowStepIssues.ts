import { amountNumber, normaliseAmount } from './amount.ts'
import type { Issue } from './validate.ts'
import { validateForm } from './validate.ts'

export function stepIssues(
  flowId: string,
  form: Record<string, string>,
  balance: number,
  limit: number,
  payees: Parameters<typeof validateForm>[3],
  wstep: number,
  reviewAt: number,
  visibleIds: string[],
) {
  const amountReady = normaliseAmount(form.amount)
  const scrubbed = amountReady ? { ...form, amount: amountReady } : form
  const found = validateForm(flowId, scrubbed, balance, payees, limit)
  const visible = new Set(visibleIds)
  if (flowId === 'paynow' && wstep === 1) visible.add('amount')
  const scoped = reviewAt >= 0 && wstep < reviewAt
    ? found.filter((issue) => visible.has(issue.field))
    : found
  if (flowId === 'paynow' && wstep === 1) {
    const amount = amountNumber(scrubbed.amount)
    if (!(amount != null && amount > 0) && !scoped.some((issue) => issue.field === 'amount')) {
      scoped.push({ field: 'amount', code: 'amount_positive', params: { amount: 'S$0.00' } })
    }
  }
  return scoped
}

export function hiddenBlockingIssues(
  flowId: string,
  form: Record<string, string>,
  balance: number,
  limit: number,
  payees: Parameters<typeof validateForm>[3],
  wstep: number,
  reviewAt: number,
  visibleIds: string[],
) {
  const amountReady = normaliseAmount(form.amount)
  const scrubbed = amountReady ? { ...form, amount: amountReady } : form
  const found = validateForm(flowId, scrubbed, balance, payees, limit)
  const visible = new Set(visibleIds)
  if (flowId === 'paynow' && wstep === 1) visible.add('amount')
  if (reviewAt < 0 || wstep >= reviewAt) return [] as Issue[]
  return found.filter((issue) => !visible.has(issue.field))
}