import type { SavedPayee } from '@/data/demoAccounts'

export const VOICE_TRANSFER_LIMIT_SGD = 200
export const VOICE_TRANSFER_MAX_SGD = 1000
export const VOICE_TRANSFER_LIMIT_OPTIONS = [0, 50, 100, 200, 500, 1000] as const
export type VoiceTransferLimit = (typeof VOICE_TRANSFER_LIMIT_OPTIONS)[number]

export function clampVoiceTransferLimit(value: unknown): VoiceTransferLimit {
  if (value === 0 || value === '0') return 0
  if (value == null || value === '') return VOICE_TRANSFER_LIMIT_SGD
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) return VOICE_TRANSFER_LIMIT_SGD
  const capped = Math.min(amount, VOICE_TRANSFER_MAX_SGD)
  if (capped === 0) return 0
  const allowed = VOICE_TRANSFER_LIMIT_OPTIONS.filter((option) => option > 0)
  const exact = allowed.find((option) => option === capped)
  if (exact !== undefined) return exact
  return allowed.reduce((best, option) => (
    Math.abs(option - capped) < Math.abs(best - capped) ? option : best
  ))
}

export function formatVoiceTransferAmount(amount: number) {
  return `S$${amount.toLocaleString('en-SG')}`
}

export type VoiceParse = {
  amount: number
  payeeQuery: string
  note?: string
}

export type VoiceMatch = {
  payee: SavedPayee
  flow: 'overseas' | 'paynow' | 'transfer'
  fields: Record<string, string>
}

const AMOUNT = String.raw`(?:s\$|sgd\s*|rm\s*|\$)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|sgd|ringgit|dolari?)?`

function cleanAmount(raw: string) {
  const value = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

function trimPayee(value: string) {
  return value
    .replace(/[?.!！？。，,]+$/g, '')
    .replace(/^(?:the|a|an|to|for)\s+/i, '')
    .trim()
}

function splitNote(payee: string): { payeeQuery: string; note?: string } {
  const match = payee.match(/^(.*?)\s+(?:for|because|as|untuk|kerana|为了|因為|因为)\s+(.+)$/u)
  if (!match) return { payeeQuery: trimPayee(payee) }
  const note = trimPayee(match[2])
  return { payeeQuery: trimPayee(match[1]), note: note || undefined }
}

function pack(amountRaw: string, payeeRaw: string): VoiceParse | null {
  const amount = cleanAmount(amountRaw)
  const { payeeQuery, note } = splitNote(payeeRaw)
  if (amount == null || !payeeQuery) return null
  return note ? { amount, payeeQuery, note } : { amount, payeeQuery }
}

export function parseVoiceTransfer(text: string): VoiceParse | null {
  const raw = text.normalize('NFKC').replace(/\s+/g, ' ').trim()
  if (!raw) return null

  const zh = raw.match(/^(?:请|請)?(?:帮我|幫我)?(?:转账|轉帳|转帐|转|轉|汇|匯)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:块|塊|元|新币|新幣|新元|刀)?\s*(?:给|給)\s*(.+)$/u)
  if (zh) return pack(zh[1], zh[2])

  const zhGive = raw.match(/^(?:请|請)?(?:帮我|幫我)?(?:给|給)\s*(.+?)\s*(?:转账|轉帳|转帐|转|轉|汇|匯)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:块|塊|元|新币|新幣|新元|刀)?$/u)
  if (zhGive) return pack(zhGive[2], zhGive[1])

  const ms = raw.match(new RegExp(`^(?:tolong\\s+)?(?:pindahkan|pindah|hantar|bayar|transfer)\\s+${AMOUNT}\\s+(?:kepada|ke|pada)\\s+(.+)$`, 'i'))
  if (ms) return pack(ms[1], ms[2])

  const enTo = raw.match(new RegExp(`^(?:please\\s+)?(?:transfer|send|paynow|pay)\\s+${AMOUNT}\\s+(?:to|for)\\s+(.+)$`, 'i'))
  if (enTo) return pack(enTo[1], enTo[2])

  const enNameFirst = raw.match(new RegExp(`^(?:please\\s+)?(?:transfer|send|pay)\\s+(.+?)\\s+${AMOUNT}$`, 'i'))
  if (enNameFirst) return pack(enNameFirst[2], enNameFirst[1])

  return null
}

const YES = /^(yes|yeah|yep|yup|ok|okay|sure|confirm|correct|right|please do|是|对|對|好|确认|確認|可以|要|ya|betul|setuju|baik)$/i
const NO = /^(no|nope|nah|cancel|stop|don't|dont|不是|不对|不對|不要|取消|不|tidak|jangan|batal)$/i

export function parseVoiceAffirmation(text: string): 'yes' | 'no' | null {
  const raw = text.normalize('NFKC').replace(/\s+/g, ' ').trim()
  if (!raw) return null
  if (YES.test(raw)) return 'yes'
  if (NO.test(raw)) return 'no'
  return null
}

function norm(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

export function matchSavedPayee(query: string, payees: SavedPayee[]): SavedPayee | null {
  const wanted = norm(query)
  if (!wanted || !payees.length) return null
  let best: { payee: SavedPayee; score: number } | null = null
  let tie = false
  for (const payee of payees) {
    const fields = [payee.name, payee.label, payee.id, payee.account, payee.swift].filter(Boolean).map((item) => norm(String(item)))
    let score = 0
    for (const field of fields) {
      if (!field) continue
      if (field === wanted) score = Math.max(score, 100)
      else if (field.includes(wanted) || wanted.includes(field)) score = Math.max(score, 80)
      else {
        const tokens = wanted.split(' ').filter((token) => token.length >= 2)
        const hits = tokens.filter((token) => field.split(' ').some((part) => part === token || part.includes(token)))
        if (tokens.length && hits.length === tokens.length) score = Math.max(score, 70)
        else if (hits.length) score = Math.max(score, 40 + hits.length * 5)
      }
    }
    if (score >= 70 && (!best || score > best.score)) {
      best = { payee, score }
      tie = false
    } else if (best && score === best.score && score >= 70 && payee.id !== best.payee.id) {
      tie = true
    }
  }
  if (!best || tie) return null
  return best.payee
}

export function voiceTransferFields(payee: SavedPayee, amount: number, note?: string, fromAccount?: string): VoiceMatch {
  const amountText = amount.toFixed(2)
  const from = fromAccount || ''
  const overseas = Boolean(payee.swift) || (payee.country && !/singapore|^sg$/i.test(payee.country))
  if (overseas) {
    return {
      payee,
      flow: 'overseas',
      fields: {
        name: payee.name,
        country: payee.country,
        swift: payee.swift || '',
        account: payee.account || '',
        amount: amountText,
        ...(from ? { from } : {}),
        purpose: note ? 'other' : 'family',
        ...(note ? { note, reference: note } : {}),
        savePayee: 'no',
        when: 'now',
      },
    }
  }
  const digits = (payee.account || '').replace(/\D/g, '').replace(/^65/, '')
  const paynow = digits.length === 8 || (payee.key || '').startsWith('paynow:')
  if (paynow) {
    return {
      payee,
      flow: 'paynow',
      fields: {
        proxy: 'mobile',
        to: digits || payee.account || '',
        amount: amountText,
        ...(from ? { from } : {}),
        ...(note ? { reference: note, note } : {}),
        savePayee: 'no',
        when: 'now',
      },
    }
  }
  return {
    payee,
    flow: 'transfer',
    fields: {
      name: payee.name,
      account: payee.account || '',
      amount: amountText,
      ...(from ? { from } : {}),
      ...(note ? { reference: note, note } : {}),
      savePayee: 'no',
      when: 'now',
    },
  }
}
