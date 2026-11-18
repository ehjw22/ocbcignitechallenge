import { extractAmountFromText } from './amount.js'
import { z } from 'zod'

const actionSchema = z.object({
  intent: z.enum(['paynow', 'transfer', 'overseas', 'bill', 'giro', 'goal', 'card-lock']),
  fields: z.record(z.string(), z.string()).default({}),
})

export const replySchema = z.object({
  reply: z.string().min(1),
  action: actionSchema.nullable().optional(),
  scamRisk: z.enum(['none', 'check', 'high']).optional(),
  suggestions: z.array(z.string().max(80)).max(4).optional(),
  handover: z.boolean().optional(),
})

export type ParsedReply = z.infer<typeof replySchema>

export function parseModelReply(text: string): ParsedReply | null {
  const trimmed = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const candidates = [trimmed]
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1))
  for (const candidate of candidates) {
    try {
      const parsed = replySchema.safeParse(JSON.parse(candidate))
      if (parsed.success) return parsed.data
    } catch {
      /* try the next shape */
    }
  }
  return null
}

export type PayeeHint = { name?: string; country?: string; label?: string }

const RANK = { none: 0, check: 1, high: 2 } as const

export function strongerRisk(a: 'none' | 'check' | 'high', b: 'none' | 'check' | 'high') {
  return RANK[a] >= RANK[b] ? a : b
}

export function attachTask<T extends { reply: string; journeyId: string | null; flags: { refused: boolean; escalated: boolean; fraud: boolean } }>(
  base: T,
  message: string,
  payees: PayeeHint[],
) {
  const detected = detectTask(message, payees)
  const action = detected.scamRisk === 'high' ? null : detected.action
  return {
    reply: base.reply,
    source: 'demo' as const,
    journeyId: detected.scamRisk === 'high' ? null : base.journeyId,
    action,
    scamRisk: detected.scamRisk,
    suggestions: [] as string[],
    handover: detected.handover,
    flags: {
      refused: base.flags.refused,
      escalated: base.flags.escalated || detected.handover,
      fraud: base.flags.fraud || detected.scamRisk === 'high',
    },
  }
}

export function detectTask(message: string, payees: PayeeHint[] = []) {
  const text = message.trim()
  if (/system\s*override|ignore previous|ignore all|<\s*\/?\s*system|jailbreak/i.test(text)) {
    return { action: null, scamRisk: 'none' as const, handover: false }
  }
  const amount = extractAmountFromText(text)
  const overThousand = Number(amount) > 1000
  if (/transfer limit|daily limit|限额|限額|had transaksi/i.test(text) && !/send|transfer|pay|转|轉|汇|匯|pindah/i.test(text)) {
    return { action: null, scamRisk: 'none' as const, handover: false }
  }
  const police = /police|government|scam|investment|guaranteed return|promised return|job offer|\bjob\b|中奖|中獎|prize|lucky draw|hadiah|警察|政府|诈骗|骗局|投资|回报|工作|騙|投資|回報|safe account|MAS|move your money/i.test(text)
  const son = /son|儿子|兒子|仔/i.test(text)
  const overseas = /australia|australian|澳洲|澳大利亚|澳大利亞|overseas|海外|国外|國外/i.test(text)
  const send = /send|transfer|remit|汇|匯|转|轉|寄|送钱|送錢/i.test(text)
  const known = payees.find((payee) => {
    const blob = `${payee.name || ''} ${payee.label || ''} ${payee.country || ''}`
    if (son && /son|儿子|仔|wei ming/i.test(blob)) return true
    if (payee.name && text.toLowerCase().includes(payee.name.toLowerCase())) return true
    return false
  })
  let action: { intent: 'paynow' | 'transfer' | 'overseas' | 'bill' | 'giro' | 'goal' | 'card-lock'; fields: Record<string, string> } | null = null
  if (/lock (my |the )?card|锁卡|鎖卡/i.test(text)) action = { intent: 'card-lock', fields: { lock: 'yes' } }
  else if (/giro/i.test(text) && /set up|start|apply|申请|申請|怎么办|怎麼/i.test(text)) action = { intent: 'giro', fields: {} }
  else if (/saving goal|savings goal|储蓄目标|儲蓄目標/i.test(text)) action = { intent: 'goal', fields: { name: 'Holiday' } }
  else if (/\bbill\b|账单|賬單/i.test(text) && send) action = { intent: 'bill', fields: amount ? { amount } : {} }
  else if (/paynow/i.test(text) && (send || amount)) action = { intent: 'paynow', fields: amount ? { amount } : {} }
  else if (send && overseas) {
    action = {
      intent: 'overseas',
      fields: {
        amount,
        country: known?.country || '',
        name: known?.name || '',
        swift: known && 'swift' in known ? String((known as { swift?: string }).swift || '') : '',
        account: known && 'account' in known ? String((known as { account?: string }).account || '') : '',
      },
    }
  } else if (send && amount) {
    action = { intent: 'transfer', fields: { amount, name: known?.name || '' } }
  }
  const named = action?.fields.name || ''
  const firstTime = Boolean(named) && !payees.some((payee) => (payee.name || '').toLowerCase() === named.toLowerCase())
  let scamRisk: 'none' | 'check' | 'high' = 'none'
  if (police) scamRisk = 'high'
  else if (action && (overThousand || (action.intent === 'overseas' && firstTime))) scamRisk = 'check'
  const handover = police || /person|human|staff|someone|客服|人工|工作人员|職員/i.test(text)
  return { action, scamRisk, handover }
}
