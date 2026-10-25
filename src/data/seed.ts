import type { AnalyticsEvent, StaffRequest } from '@/lib/types'

function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const LANGS = ['en', 'zh', 'ms', 'ta', 'zh-TW', 'id', 'vi', 'th', 'tl', 'ko', 'ja', 'hi', 'bn']
const LANG_W = [34, 22, 10, 6, 5, 5, 4, 3, 3, 2, 2, 2, 2]
const pick = (rand: () => number, values: string[], weights: number[]) => {
  const total = weights.reduce((s, n) => s + n, 0)
  let cursor = rand() * total
  for (let i = 0; i < values.length; i += 1) {
    cursor -= weights[i]
    if (cursor <= 0) return values[i]
  }
  return values[0]
}

export interface SeedUser {
  language: string
  textSize: number
  colourVision: string
  help: string
  readAloud: boolean
  highContrast: boolean
  boldText: boolean
}

export function seedUsers(): SeedUser[] {
  const rand = rng(22)
  return Array.from({ length: 180 }, () => {
    const textSize = pick(rand, ['16', '18', '20', '22', '24'], [50, 22, 14, 9, 5])
    return {
      language: pick(rand, LANGS, LANG_W),
      textSize: Number(textSize),
      colourVision: pick(rand, ['default', 'protanopia', 'deuteranopia', 'tritanopia', 'monochrome'], [80, 5, 6, 3, 6]),
      help: pick(rand, ['ai', 'guide', 'staff'], [46, 30, 24]),
      readAloud: rand() > 0.72,
      highContrast: rand() > 0.86,
      boldText: rand() > 0.7,
    }
  })
}

export const FUNNELS: Record<string, { step: string; reached: number }[]> = {
  paynow: [
    { step: 'recipient', reached: 120 },
    { step: 'amount', reached: 98 },
    { step: 'reference', reached: 90 },
    { step: 'review', reached: 74 },
    { step: 'completed', reached: 61 },
  ],
  transfer: [
    { step: 'name', reached: 140 },
    { step: 'account', reached: 121 },
    { step: 'amount', reached: 100 },
    { step: 'review', reached: 80 },
    { step: 'completed', reached: 66 },
  ],
  overseas: [
    { step: 'name', reached: 70 },
    { step: 'country', reached: 64 },
    { step: 'swift', reached: 49 },
    { step: 'account', reached: 41 },
    { step: 'amount', reached: 36 },
    { step: 'review', reached: 28 },
    { step: 'completed', reached: 18 },
  ],
  bill: [
    { step: 'biller', reached: 88 },
    { step: 'ref', reached: 76 },
    { step: 'amount', reached: 70 },
    { step: 'review', reached: 60 },
    { step: 'completed', reached: 54 },
  ],
  giro: [
    { step: 'org', reached: 64 },
    { step: 'account', reached: 52 },
    { step: 'limit', reached: 40 },
    { step: 'review', reached: 33 },
    { step: 'completed', reached: 24 },
  ],
  scan: [
    { step: 'frame', reached: 96 },
    { step: 'amount', reached: 80 },
    { step: 'review', reached: 71 },
    { step: 'completed', reached: 63 },
  ],
  goal: [
    { step: 'name', reached: 54 },
    { step: 'target', reached: 48 },
    { step: 'monthly', reached: 39 },
    { step: 'review', reached: 34 },
    { step: 'completed', reached: 29 },
  ],
  'card-lock': [
    { step: 'card', reached: 44 },
    { step: 'toggle', reached: 40 },
    { step: 'review', reached: 36 },
    { step: 'completed', reached: 33 },
  ],
  'card-lost': [
    { step: 'card', reached: 22 },
    { step: 'confirm', reached: 18 },
    { step: 'completed', reached: 16 },
  ],
  limit: [
    { step: 'current', reached: 38 },
    { step: 'next', reached: 30 },
    { step: 'review', reached: 24 },
    { step: 'completed', reached: 19 },
  ],
}

export const SEED_ERRORS = [
  { code: 'account_digits', count: 42 },
  { code: 'swift', count: 22 },
  { code: 'paynow_mobile', count: 18 },
  { code: 'insufficient', count: 15 },
  { code: 'amount_format', count: 11 },
  { code: 'nric', count: 7 },
]

export const SEED_QUESTIONS = [
  { q: 'What is GIRO?', count: 36 },
  { q: 'How do I use PayNow?', count: 29 },
  { q: 'Did my transfer go through?', count: 21 },
  { q: 'How do I lock my card?', count: 17 },
  { q: 'What is a SWIFT code?', count: 14 },
]

export const SEED_REFUSED = [
  { q: 'Book me a flight to Osaka', reason: 'off topic' },
  { q: 'Write a poem about my cat', reason: 'off topic' },
  { q: 'What is the exact fee for this transfer?', reason: 'would invent a fee' },
]

export const SEED_REQUESTS: StaffRequest[] = [
  {
    ref: 'OCBC-A1842',
    createdAt: '2026-10-20T09:12:00.000Z',
    summary: 'Customer paused on an overseas transfer to Australia at the account number step. Language: 中文.',
    summaryEn: 'Needs help with: Overseas transfer (step 4 of 7).',
    task: 'Overseas transfer',
    step: 'account',
    language: 'zh',
    method: 'phone',
    time: 'morning',
    contact: '9123 0000',
    status: 'received',
    urgent: false,
  },
  {
    ref: 'OCBC-K2201',
    createdAt: '2026-10-21T03:40:00.000Z',
    summary: 'Customer asked what GIRO means and wants a person to confirm the billing organisation.',
    summaryEn: 'Needs help with: GIRO (step 1 of 4). Last question: What is GIRO?',
    task: 'GIRO',
    step: 'org',
    language: 'en',
    method: 'message',
    time: 'afternoon',
    contact: '',
    status: 'in_progress',
    urgent: false,
  },
  {
    ref: 'OCBC-M7730',
    createdAt: '2026-10-18T11:05:00.000Z',
    summary: 'Question about a sample bill payment reference.',
    summaryEn: 'Needs help with: Pay a bill (step 2 of 4).',
    task: 'Pay bill',
    step: 'ref',
    language: 'ms',
    method: 'email',
    time: 'evening',
    contact: 'siti@example.com',
    status: 'replied',
    urgent: false,
  },
]

export function seedEvents(): AnalyticsEvent[] {
  const rand = rng(8)
  const events: AnalyticsEvent[] = []
  const push = (type: string, data: AnalyticsEvent['data']) => {
    events.push({
      id: `seed-${events.length}`,
      ts: new Date(Date.UTC(2026, 9, 1 + Math.floor(rand() * 20), Math.floor(rand() * 24))).toISOString(),
      type,
      data,
    })
  }
  Object.entries(FUNNELS).forEach(([guideId, steps]) => {
    push('guide_started', { guideId, count: steps[0].reached })
    push('guide_completed', { guideId, count: steps[steps.length - 1].reached })
  })
  push('guide_step_missing', { guideId: 'overseas', element: 'overseas-purpose', stepId: 'purpose' })
  SEED_QUESTIONS.forEach((item) => push('ai_question', { question: item.q, count: item.count }))
  SEED_REFUSED.forEach((item) => push('ai_refused', { question: item.q, reason: item.reason }))
  push('ai_escalated', { question: 'I think someone scammed me', reason: 'fraud', count: 9 })
  push('ai_escalated', { question: 'I lost my card', reason: 'lost card', count: 6 })
  SEED_ERRORS.forEach((item) => push('error_shown', { code: item.code, count: item.count }))
  return events
}
