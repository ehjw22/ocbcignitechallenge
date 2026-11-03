export type RiskLevel = 'none' | 'check' | 'high'
export type RiskReason =
  | 'large-amount'
  | 'new-payee-amount'
  | 'paid-before'
  | 'overseas-new-payee'
  | 'new-payee-24h-total'
  | 'unusual-for-you'
  | 'scam-words'

export const RISK_CONFIG = {
  largeAmount: 1000,
  newPayeeAmount: 200,
  newPayee24hTotal: 1000,
  tinyAmount: 50,
  unusualMultiplier: 3,
  coolingHighSeconds: 10,
}

export type RiskConfig = typeof RISK_CONFIG

const RISK_KEY = 'ocbc-adaptive-risk-config'

export function loadRiskConfig(): RiskConfig {
  try {
    const raw = localStorage.getItem(RISK_KEY)
    if (!raw) return { ...RISK_CONFIG }
    return { ...RISK_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...RISK_CONFIG }
  }
}

export function saveRiskConfig(next: Partial<RiskConfig>) {
  const config = { ...loadRiskConfig(), ...next }
  localStorage.setItem(RISK_KEY, JSON.stringify(config))
  return config
}

const LATIN = [
  'investment', 'job', 'refund', 'police', 'customs', 'mas', 'ica', 'parcel', 'lucky draw', 'prize', 'crypto', 'loan',
  'pelaburan', 'kerja', 'bayaran balik', 'polis', 'kastam', 'hadiah', 'pinjaman',
]

const CJK = ['投资', '工作', '退款', '警察', '海关', '投資', '海關', '中奖', '包裹', '贷款', '中獎', '貸款']

export function matchedScamWords(text: string) {
  const norm = text.normalize('NFKC').toLowerCase()
  const hits: string[] = []
  for (const phrase of LATIN) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, 'iu')
    if (pattern.test(norm)) hits.push(phrase)
  }
  for (const phrase of CJK) {
    if (norm.includes(phrase.normalize('NFKC').toLowerCase())) hits.push(phrase)
  }
  return hits
}

export interface RiskPayee {
  key?: string
  name?: string
  country?: string
  swift?: string
  account?: string
}

export function payeeKeys(payee: RiskPayee) {
  const keys: string[] = []
  if (payee.key) keys.push(payee.key.toLowerCase())
  if (payee.swift && payee.account) keys.push(`overseas:${payee.swift.toUpperCase()}:${payee.account.replace(/\s/g, '')}`)
  if (payee.name && payee.country) keys.push(`overseas-name:${payee.name.trim().toLowerCase()}:${payee.country.trim().toLowerCase()}`)
  return keys
}

export function candidateKeys(flowId: string, fields: Record<string, string>) {
  const keys: string[] = []
  if (flowId === 'paynow') keys.push(`paynow:${(fields.to || '').replace(/\s/g, '').toLowerCase()}`)
  else if (flowId === 'transfer') keys.push(`local:${(fields.bank || '').toLowerCase()}:${(fields.account || '').replace(/\s/g, '')}`)
  else if (flowId === 'overseas') {
    keys.push(`overseas:${(fields.swift || '').toUpperCase()}:${(fields.account || '').replace(/\s/g, '')}`)
    if (fields.name && fields.country) keys.push(`overseas-name:${fields.name.trim().toLowerCase()}:${fields.country.trim().toLowerCase()}`)
  } else if (flowId === 'scan') keys.push(`merchant:${(fields.merchant || '').trim().toLowerCase()}`)
  else keys.push(`${flowId}:${(fields.biller || fields.organisation || fields.name || '').trim().toLowerCase()}`)
  return keys.filter((key) => !key.endsWith(':') && !key.endsWith('::'))
}

export function assessTransferRisk(input: {
  flowId: 'paynow' | 'transfer' | 'overseas' | 'scan' | 'bill' | 'giro' | 'topup' | string
  amount: number
  payeeKey?: string
  keys?: string[]
  payees?: RiskPayee[]
  history?: { payeeKey: string; amount: number; at: number }[]
  text?: string
  usualTransfer?: number
  config?: Partial<RiskConfig>
  now?: number
}) {
  const config = { ...RISK_CONFIG, ...input.config }
  const amount = Number(input.amount) || 0
  const words = matchedScamWords(input.text || '')
  const knownMerchant = input.flowId === 'scan' || input.flowId === 'bill' || input.flowId === 'giro' || input.flowId === 'topup'
  const candidates = [...(input.keys || []), input.payeeKey || ''].map((key) => key.toLowerCase()).filter(Boolean)
  const savedKeys = new Set((input.payees || []).flatMap(payeeKeys))
  const saved = !knownMerchant && candidates.some((key) => key && savedKeys.has(key))
  const reasons: RiskReason[] = []
  const now = input.now ?? Date.now()
  const earlier = (input.history || []).filter((row) => candidates.includes(row.payeeKey.toLowerCase()) && now - row.at < 24 * 60 * 60 * 1000)
  const prior = earlier.reduce((sum, row) => sum + row.amount, 0)
  const hasHistory = earlier.length > 0
  if (words.length) reasons.push('scam-words')
  if (amount >= config.tinyAmount) {
    if (amount >= config.largeAmount) reasons.push('large-amount')
    if (!saved && !knownMerchant) {
      if (amount >= config.newPayeeAmount && !hasHistory) reasons.push('new-payee-amount')
      if (amount >= config.newPayeeAmount && hasHistory) reasons.push('paid-before')
      if (input.flowId === 'overseas' && !hasHistory) reasons.push('overseas-new-payee')
      if (hasHistory && prior + amount >= config.newPayee24hTotal) reasons.push('new-payee-24h-total')
    }
    const usual = input.usualTransfer || 0
    if (!saved && !knownMerchant && amount >= config.newPayeeAmount && usual > 0 && amount >= usual * config.unusualMultiplier) {
      reasons.push('unusual-for-you')
    }
  }
  const high = reasons.includes('scam-words')
    || (reasons.includes('overseas-new-payee') && amount >= config.largeAmount)
    || amount >= 5000
  const level: RiskLevel = reasons.length === 0 ? 'none' : high ? 'high' : 'check'
  return { level, reasons, words, saved, dayTotal: prior + amount, prior }
}
