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
  amount: number | null
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
    .replace(/^(?:some\s+)?money\s+to\s+/i, '')
    .replace(/\s+(?:lah|leh|lor|hor)$/i, '')
    .trim()
}

function fixVoiceKeywords(text: string) {
  return text
    .replace(/\btrasnfer\b/gi, 'transfer')
    .replace(/\btranfer\b/gi, 'transfer')
    .replace(/\btrnasfer\b/gi, 'transfer')
    .replace(/\bsned\b/gi, 'send')
}

function splitNote(payee: string): { payeeQuery: string; note?: string } {
  const match = payee.match(/^(.*?)\s+(?:for|because|as|untuk|kerana|为了|因為|因为)\s+(.+)$/u)
  if (!match) return { payeeQuery: trimPayee(payee) }
  const note = trimPayee(match[2])
  return { payeeQuery: trimPayee(match[1]), note: note || undefined }
}

const NUMBER_WORDS: Record<string, string> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', fifteen: '15', twenty: '20', thirty: '30', forty: '40', fifty: '50',
  sixty: '60', seventy: '70', eighty: '80', ninety: '90', hundred: '100',
  satu: '1', dua: '2', tiga: '3', empat: '4', lima: '5', enam: '6', tujuh: '7', lapan: '8', sembilan: '9', sepuluh: '10', 'dua puluh': '20',
  二十: '20', 三十: '30', 五十: '50', 一百: '100',
}

function spellNumbers(text: string) {
  return text.replace(/\b(?:dua puluh|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|satu|dua|tiga|empat|lima|enam|tujuh|lapan|sembilan|sepuluh)\b|二十|三十|五十|一百/gi, (word) => NUMBER_WORDS[word.toLowerCase()] || NUMBER_WORDS[word] || word)
}

function pack(amountRaw: string | null, payeeRaw: string): VoiceParse | null {
  const amount = amountRaw == null ? null : cleanAmount(amountRaw)
  const { payeeQuery, note } = splitNote(payeeRaw)
  if ((amountRaw != null && amount == null) || !payeeQuery) return null
  if (/^money\b/i.test(payeeQuery)) return null
  return note ? { amount, payeeQuery, note } : { amount, payeeQuery }
}

export function invalidVoiceAmount(text: string) {
  const raw = text.normalize('NFKC').trim()
  if (/^(?:s\$|\$)?0(?:\.0+)?$/.test(raw)) return true
  if (!/(?:transfer|send|pay|转|轉|汇|匯|pindah)/i.test(raw)) return false
  return /-\s*\d/.test(raw) || /\d+\.\d{3,}/.test(raw) || /(?:s\$|\$)?\b0(?:\.0+)?\b/.test(raw)
}

export function parseVoiceTransfer(text: string): VoiceParse | null {
  const raw = fixVoiceKeywords(spellNumbers(text.normalize('NFKC').replace(/\s+/g, ' ').trim()))
  if (!raw || invalidVoiceAmount(text)) return null
  const moneyTo = raw.match(/^(?:please\s+)?(?:transfer|send)\s+money\s+to\s+(.+)$/i)
  if (moneyTo) return pack(null, moneyTo[1])
  const payFor = raw.match(new RegExp(`^pay\\s+(.+?)\\s+${AMOUNT}\\s+for\\s+(.+)$`, 'i'))
  if (payFor) {
    const amount = cleanAmount(payFor[2])
    const payeeQuery = trimPayee(payFor[1])
    const note = trimPayee(payFor[3])
    if (amount && payeeQuery) return { amount, payeeQuery, note: note || undefined }
  }
  const vague = raw.match(/^(?:please\s+)?(?:transfer|send|pay)\s+(?:some|a bit of)\s+money\s+(?:to|for)\s+(.+)$/i)
    || raw.match(/^(?:tolong\s+)?(?:pindahkan|pindah|hantar|transfer)\s+(?:sedikit|some)\s+(?:wang|duit|money)\s+(?:kepada|ke)\s+(.+)$/i)
    || raw.match(/^(?:给|給)\s*(.+?)\s*(?:转|轉|汇|匯)\s*(?:一些|一点|一點)(?:钱|錢|元)?$/u)
  if (vague) return pack(null, vague[1])
  const named = raw.match(/^(?:please\s+)?(?:paynow|transfer|send|pay)\s+([^\d]+)$/i)
  if (named && !/\d/.test(named[1])) return pack(null, named[1])

  const zhJohn = raw.match(/^(?:请|請)?(?:帮我|幫我)?(?:给|給)\s*([\p{L}\s]+?)\s*(?:转账|轉帳|转帐|转|轉|汇|匯)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:块|塊|元|新币|新幣|新元|刀)?$/u)
  if (zhJohn) return pack(zhJohn[2], zhJohn[1])

  const zh = raw.match(/^(?:请|請)?(?:帮我|幫我)?(?:转账|轉帳|转帐|转|轉|汇|匯)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:块|塊|元|新币|新幣|新元|刀)?\s*(?:给|給)\s*(.+)$/u)
  if (zh) return pack(zh[1], zh[2])

  const zhGive = raw.match(/^(?:请|請)?(?:帮我|幫我)?(?:给|給)\s*(.+?)\s*(?:转账|轉帳|转帐|转|轉|汇|匯)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:块|塊|元|新币|新幣|新元|刀)?$/u)
  if (zhGive) return pack(zhGive[2], zhGive[1])

  const ms = raw.match(new RegExp(`^(?:tolong\\s+)?(?:pindahkan|pindah|hantar|bayar|transfer)\\s+${AMOUNT}\\s+(?:kepada|ke|pada)\\s+(.+)$`, 'i'))
  if (ms) return pack(ms[1], ms[2])

  const enHelp = raw.match(new RegExp(`^(?:can(?:\\s+you)?\\s+|could you\\s+|please\\s+)?(?:help me\\s+)?(?:pay|transfer|send)\\s+(.+?)\\s+${AMOUNT}(?:\\s+.+)?$`, 'i'))
  if (enHelp) return pack(enHelp[2], enHelp[1])

  const enTo = raw.match(new RegExp(`^(?:please\\s+)?(?:transfer|send|paynow|pay)\\s+${AMOUNT}\\s+(?:to|for)\\s+(.+)$`, 'i'))
  if (enTo) return pack(enTo[1], enTo[2])

  const enNameFirst = raw.match(new RegExp(`^(?:please\\s+)?(?:transfer|send|pay)\\s+(.+?)\\s+${AMOUNT}$`, 'i'))
  if (enNameFirst) return pack(enNameFirst[2], enNameFirst[1])

  const yueA = raw.match(new RegExp(`^(?:轉|转|轉帳|转账|過數|过数)\\s*${AMOUNT}\\s*(?:蚊|文|元)?\\s*(?:俾|畀|给|給)\\s*(.+)$`, 'u'))
  if (yueA) return pack(yueA[1], yueA[2])
  const yueB = raw.match(new RegExp(`^(?:俾|畀|给|給)\\s*(.+?)\\s*(?:轉|转|過|过)\\s*${AMOUNT}\\s*(?:蚊|文|元)?$`, 'u'))
  if (yueB) return pack(yueB[2], yueB[1])

  const id = raw.match(new RegExp(`^(?:transfer|kirim)\\s+${AMOUNT}\\s+(?:ke|kepada)\\s+(.+)$`, 'i'))
  if (id) return pack(id[1], id[2])

  const taA = raw.match(/^([\p{L}\s]+?)\s*(?:க்கு|கு)\s*(\d+(?:\.\d{1,2})?)\s*(?:அனுப்பு|அனுப்பவும்|அனுப்புங்கள்)?\.?$/u)
    || raw.match(new RegExp(`^([\\p{L}\\s]+?)\\s*(?:க்கு|கு)\\s*${AMOUNT}\\s*(?:அனுப்பு|அனுப்பவும்|அனுப்புங்கள்)?\\.?$`, 'u'))
  if (taA) return pack(taA[2], taA[1])
  const taB = raw.match(new RegExp(`^${AMOUNT}\\s*(?:டாலர்|வெள்ளி)?\\s*([\\p{L}\\s]+?)\\s*(?:க்கு|கு)\\.?$`, 'u'))
  if (taB) return pack(taB[2], taB[1])

  const vi = raw.match(new RegExp(`^(?:chuyển|gửi)\\s+${AMOUNT}\\s+(?:cho|tới)\\s+(.+)$`, 'iu'))
  if (vi) return pack(vi[1], vi[2])

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

const FUZZY_THRESHOLD = 0.6

function levenshtein(a: string, b: string) {
  const rows = a.length + 1
  const cols = b.length + 1
  const grid = Array.from({ length: rows }, () => Array<number>(cols).fill(0))
  for (let i = 0; i < rows; i += 1) grid[i][0] = i
  for (let j = 0; j < cols; j += 1) grid[0][j] = j
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + cost)
    }
  }
  return grid[a.length][b.length]
}

function similarity(a: string, b: string) {
  const left = norm(a)
  const right = norm(b)
  if (!left || !right) return 0
  if (left === right) return 1
  if (right.includes(left) || left.includes(right)) return Math.max(0.82, 1 - levenshtein(left, right) / Math.max(left.length, right.length))
  return 1 - levenshtein(left, right) / Math.max(left.length, right.length)
}

export function payeeLabels(payee: SavedPayee) {
  return [payee.name, payee.label, payee.id, payee.account, payee.swift, ...(payee.aliases || [])].filter(Boolean).map((item) => String(item))
}

export function fuzzyPayeeScore(query: string, payee: SavedPayee): number {
  const wanted = norm(query)
  if (!wanted) return 0
  let best = 0
  for (const label of payeeLabels(payee)) {
    const field = norm(label)
    if (!field) continue
    if (field === wanted) return 1
    const parts = field.split(' ').filter(Boolean)
    if (parts.some((part) => part === wanted)) best = Math.max(best, 0.92)
    best = Math.max(best, similarity(wanted, field))
    if (parts.length > 1 && parts[0] === wanted) best = Math.max(best, 0.9)
  }
  const relations: Record<string, string[]> = {
    son: ['son', '儿子', '兒子', 'anak lelaki'],
    daughter: ['daughter', '女儿', '女兒', 'anak perempuan'],
    mum: ['mum', 'mom', 'mother', '妈妈', '媽媽', 'ibu'],
    dad: ['dad', 'father', '爸爸', 'bapa', 'ayah'],
  }
  for (const words of Object.values(relations)) {
    const queryHit = words.some((word) => norm(word) === wanted)
    const payeeHit = words.some((word) => payeeLabels(payee).some((field) => norm(field).includes(norm(word))))
    if (queryHit && payeeHit) best = Math.max(best, 0.9)
  }
  return best
}

export type PayeeResolve =
  | { status: 'match'; payee: SavedPayee; exact: boolean }
  | { status: 'suggest'; payee: SavedPayee; query: string }
  | { status: 'choose'; payees: SavedPayee[]; query: string }
  | { status: 'none'; query: string }

export function resolvePayeeQuery(query: string, payees: SavedPayee[], threshold = FUZZY_THRESHOLD): PayeeResolve {
  const wanted = norm(query)
  if (!wanted || !payees.length) return { status: 'none', query }
  const ranked = payees
    .map((payee) => ({ payee, score: fuzzyPayeeScore(query, payee) }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score)
  if (!ranked.length) return { status: 'none', query }
  const best = ranked[0]
  if (best.score >= 0.95) return { status: 'match', payee: best.payee, exact: best.score >= 0.99 }
  const close = ranked.filter((item) => best.score - item.score <= 0.06).slice(0, 3)
  if (close.length > 1) return { status: 'choose', payees: close.map((item) => item.payee), query }
  if (best.score < 0.95) return { status: 'suggest', payee: best.payee, query }
  return { status: 'match', payee: best.payee, exact: best.score >= 0.99 }
}

export function matchSavedPayee(query: string, payees: SavedPayee[]): SavedPayee | null {
  const resolved = resolvePayeeQuery(query, payees, 0.7)
  if (resolved.status === 'match') return resolved.payee
  if (resolved.status === 'suggest') return resolved.payee
  return null
}

export type VoiceTransferOutcome =
  | { type: 'uncaught' }
  | { type: 'badAmount' }
  | { type: 'notTransfer' }
  | { type: 'askAmount'; payee: SavedPayee }
  | { type: 'confirm'; payee: SavedPayee; amount: number; match: VoiceMatch }
  | { type: 'suggest'; payee: SavedPayee; amount: number; query: string }
  | { type: 'choose'; payees: SavedPayee[]; amount: number; query: string }
  | { type: 'noMatch'; amount: number; query: string }
  | { type: 'overLimit'; payee: SavedPayee; amount: number; match: VoiceMatch }
  | { type: 'disabled'; payee: SavedPayee | null; amount: number; query: string; match: VoiceMatch | null }

export function isEmptyVoiceTranscript(text: string) {
  return !text.normalize('NFKC').trim()
}

export function voiceTransferMessageKey(outcome: VoiceTransferOutcome): string {
  if (outcome.type === 'uncaught') return 'ai.voiceUncaught'
  if (outcome.type === 'badAmount') return 'ai.voiceBadAmount'
  if (outcome.type === 'askAmount') return 'ai.voiceAskAmount'
  if (outcome.type === 'confirm') return 'ai.voiceConfirm'
  if (outcome.type === 'suggest') return 'ai.voiceDidYouMean'
  if (outcome.type === 'choose') return 'ai.voiceWhoToPay'
  if (outcome.type === 'noMatch') return 'ai.voiceNoMatchPayees'
  if (outcome.type === 'overLimit') return 'ai.voiceOverLimit'
  if (outcome.type === 'disabled') return 'ai.voiceOff'
  return 'ai.voiceUnknownPayee'
}

export function resolveVoiceTransfer(
  text: string,
  payees: SavedPayee[],
  limit: VoiceTransferLimit,
  fromAccount?: string,
): VoiceTransferOutcome {
  if (isEmptyVoiceTranscript(text)) return { type: 'uncaught' }
  if (invalidVoiceAmount(text)) return { type: 'badAmount' }
  const parsed = parseVoiceTransfer(text)
  if (!parsed) return { type: 'notTransfer' }
  if (parsed.amount == null) {
    const resolved = resolvePayeeQuery(parsed.payeeQuery, payees)
    if (resolved.status === 'none') return { type: 'noMatch', amount: 0, query: parsed.payeeQuery }
    const payee = resolved.status === 'choose' ? resolved.payees[0] : resolved.status === 'suggest' ? resolved.payee : resolved.payee
    return { type: 'askAmount', payee }
  }
  const resolved = resolvePayeeQuery(parsed.payeeQuery, payees)
  if (resolved.status === 'suggest') return { type: 'suggest', payee: resolved.payee, amount: parsed.amount, query: parsed.payeeQuery }
  if (resolved.status === 'choose') return { type: 'choose', payees: resolved.payees, amount: parsed.amount, query: parsed.payeeQuery }
  if (resolved.status === 'none') return { type: 'noMatch', amount: parsed.amount, query: parsed.payeeQuery }
  const payee = resolved.payee
  const match = voiceTransferFields(payee, parsed.amount, parsed.note, fromAccount)
  if (limit === 0) return { type: 'disabled', payee, amount: parsed.amount, query: parsed.payeeQuery, match }
  if (parsed.amount > limit) return { type: 'overLimit', payee, amount: parsed.amount, match }
  return { type: 'confirm', payee, amount: parsed.amount, match }
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
