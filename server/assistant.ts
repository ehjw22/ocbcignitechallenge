type Pack = Record<string, unknown>

import journeys from '../src/guides/journeys.json' with { type: 'json' }

export type DemoResult = {
  reply: string
  source: 'demo'
  flags: { refused: boolean; escalated: boolean; fraud: boolean }
  intent: string
  journeyId: string | null
}

const JOURNEY_IDS = new Set(Object.keys(journeys))

const HOW = /how|show me|steps|guide|where|walk me|help me|怎么|如何|怎样|bagaimana|macam mana|எப்படி/i

export function journeyFor(message: string, intent: string) {
  const mapped: Record<string, string> = {
    paynow: 'paynow',
    transfer: 'transfer',
    overseas: 'overseas',
    bill: 'bill',
    giro: 'giro',
    savings: 'goal',
    cardlock: 'card-lock',
    settings: 'settings',
  }
  const id = mapped[intent]
  if (!id || !JOURNEY_IDS.has(id)) return null
  const words = message.trim().split(/\s+/).filter(Boolean).length
  if (HOW.test(message) || words <= 8) return id
  return null
}

function dig(obj: unknown, path: string): string | undefined {
  let cur: unknown = obj
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

const RULES: { intent: string; re: RegExp }[] = [
  { intent: 'secret', re: /password|\botp\b|\bpin\b|full card|card number|cvv|\d{13,}/i },
  { intent: 'fraud', re: /fraud|scam|phish|unauthori[sz]ed|dispute|stolen|hacked|cheat|诈骗|骗局|盗刷|penipuan|tipu|scammer|骗/i },
  { intent: 'cardlock', re: /lock (my |the )?card|unlock (my |the )?card|锁卡|解锁|kunci kad/i },
  { intent: 'lostcard', re: /lost (my )?card|card (is )?lost|misplaced|丢了卡|卡丢|kad hilang|card missing|report.*card/i },
  { intent: 'settings', re: /settings|text size|colour|color|shortcut|language|字体|设置|bahasa|tetapan/i },
  { intent: 'staff', re: /speak to (a )?(person|human|staff|someone)|contact (ocbc )?staff|call me|real person|客服|人工|工作人员/i },
  { intent: 'giro', re: /giro/i },
  { intent: 'paynow', re: /paynow|pay now/i },
  { intent: 'overseas', re: /overseas|foreign|swift|remit|australia|澳洲|海外|luar negara|国外/i },
  { intent: 'limit', re: /transfer limit|daily limit|限额|had transaksi/i },
  { intent: 'savings', re: /saving goal|savings goal|储蓄目标|目标储蓄/i },
  { intent: 'bill', re: /\bbills?\b|utility|账单|bil elektrik/i },
  { intent: 'balance', re: /balance|how much (money|do i)|余额|baki/i },
  { intent: 'fees', re: /\bfees?\b|\bcharges?\b|interest rate|exchange rate|汇率|手续费|yuran|费用/i },
  { intent: 'scan', re: /qr|scan/i },
  { intent: 'transfer', re: /transfer|send money|转账|pindah wang|汇款/i },
]

const BANK = /bank|account|pay|card|money|ocbc|transfer|help|app|screen|guide|deposit|qr|saving|bill|limit|lock|staff|balance|giro|paynow/i

export function demoReply(
  pack: Pack,
  input: { message: string; detail: 'short' | 'full'; screen: string; userTurns: number },
): DemoResult {
  const message = input.message || ''
  let intent = 'general'
  for (const rule of RULES) {
    if (rule.re.test(message)) {
      intent = rule.intent
      break
    }
  }
  if (intent === 'general' && message.trim() && !BANK.test(message) && message.trim().split(/\s+/).length > 2) {
    intent = 'offtopic'
  }

  const detail = input.detail === 'short' ? 'short' : 'full'
  const textOf = (key: string) => dig(pack, key) || dig(pack, 'ai.faq.general.' + detail) || 'I can help with banking in this demo app.'
  let reply = textOf(`ai.faq.${intent}.${detail}`)
  if (intent === 'offtopic') reply = textOf('ai.faq.offtopic.' + detail)

  const fraud = intent === 'fraud' || intent === 'lostcard'
  const escalated = fraud || intent === 'staff' || input.userTurns >= 3
  const refused = intent === 'offtopic'
  if (escalated && intent !== 'staff') {
    const extra = textOf('ai.stuck')
    if (!reply.includes(extra)) reply = `${reply}\n\n${extra}`
  }
  if (fraud) {
    const hotline = textOf('ai.hotline')
    if (!reply.includes('+65')) reply = `${reply}\n\n${hotline}`
  }
  const journeyId = refused || fraud ? null : journeyFor(message, intent)
  return { reply, source: 'demo', flags: { refused, escalated, fraud }, intent, journeyId }
}
