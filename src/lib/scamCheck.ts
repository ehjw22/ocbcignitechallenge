/** Local transfer risk rules. No model call is required for the warning. */

export const SCAM_AMOUNT_LIMIT = 1000
export const SCAM_NEW_PAYEE_LIMIT = 500
export const SCAM_USUAL_MULTIPLIER = 3
export const SCAM_COOLING_LIMIT = 5000
export const SCAM_COOLING_SECONDS = 10

export const SCAM_FLOWS = ['paynow', 'transfer', 'overseas', 'scan'] as const

let sheetOpen = false
const sheetListeners = new Set<() => void>()

export function setScamSheetOpen(open: boolean) {
  if (sheetOpen === open) return
  sheetOpen = open
  sheetListeners.forEach((listener) => listener())
}

export function scamSheetOpen() {
  return sheetOpen
}

export function subscribeScamSheet(listener: () => void) {
  sheetListeners.add(listener)
  return () => sheetListeners.delete(listener)
}

const KEYWORDS = [
  'investment', 'job', 'refund', 'police', 'customs',
  '投资', '工作', '退款', '警察', '海关',
  '投資', '海關',
]

export type ScamReason = 'amount' | 'new-payee' | 'overseas-new' | 'unusual-amount' | 'keyword'

export interface ScamPayee {
  name: string
  label: string
  country?: string
}

export function assessTransfer(input: {
  flowId: string
  amount: number
  usual: number
  fields: Record<string, string>
  payees: ScamPayee[]
}): ScamReason[] {
  if (!SCAM_FLOWS.includes(input.flowId as (typeof SCAM_FLOWS)[number])) return []
  const reasons: ScamReason[] = []
  const fresh = isNewPayee(input.flowId, input.fields, input.payees)
  const limit = fresh ? SCAM_NEW_PAYEE_LIMIT : SCAM_AMOUNT_LIMIT
  if (input.amount >= limit) reasons.push('amount')
  if (fresh) reasons.push('new-payee')
  if (input.flowId === 'overseas' && fresh) reasons.push('overseas-new')
  const usual = input.usual > 0 ? input.usual : 0
  if (usual > 0 && input.amount >= usual * SCAM_USUAL_MULTIPLIER) reasons.push('unusual-amount')
  const blob = [input.fields.reference, input.fields.purpose, input.fields.note].filter(Boolean).join(' ')
  if (KEYWORDS.some((word) => blob.toLowerCase().includes(word.toLowerCase()))) reasons.push('keyword')
  return reasons
}

function isNewPayee(flowId: string, fields: Record<string, string>, payees: ScamPayee[]) {
  if (fields.savePayee === 'yes') return true
  const raw = (fields.name || fields.to || fields.merchant || '').trim().toLowerCase()
  if (!raw) return true
  return !payees.some((payee) => {
    const name = payee.name.trim().toLowerCase()
    const label = payee.label.trim().toLowerCase()
    if (!name) return false
    if (flowId === 'overseas') return name === raw && (!fields.country || payee.country === fields.country)
    return name === raw || label === raw || label.includes(raw)
  })
}
