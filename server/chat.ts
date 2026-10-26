import type { IncomingMessage, ServerResponse } from 'node:http'
import OpenAI from 'openai'
import { demoReply, journeyFor, type DemoResult } from './assistant.js'
import { llmSettings } from './env.js'
import { clientIp, readBody, send } from './http.js'
import { rateLimited } from './limit.js'
import { localePack, readPath } from './locales.js'
import { attachTask, detectTask, parseModelReply, strongerRisk, type PayeeHint } from './reply.js'

const MAX_BODY = 20_000
const MAX_MESSAGES = 8
const MAX_MESSAGE = 2_000
const CHAT_PER_MINUTE = 20

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type ChatBody = {
  messages?: ChatMessage[]
  language?: string
  languageName?: string
  detail?: 'short' | 'full'
  screen?: string
  step?: string
  dialect?: string
  explain?: boolean
  labels?: string
  accounts?: { name: string; balance: number }[]
  payees?: PayeeHint[]
}

function stripFlags(text: string) {
  let refused = false
  let escalated = false
  let fraud = false
  let reply = text
  const pull = (token: string, flag: 'refused' | 'escalated' | 'fraud') => {
    if (!reply.includes(token)) return
    if (flag === 'refused') refused = true
    if (flag === 'escalated') escalated = true
    if (flag === 'fraud') fraud = true
    reply = reply.replaceAll(token, '')
  }
  pull('[[FRAUD]]', 'fraud')
  pull('[[ESCALATE]]', 'escalated')
  pull('[[REFUSE]]', 'refused')
  return { reply: reply.trim(), refused, escalated, fraud }
}

function withBusyNote(pack: Record<string, unknown>, result: DemoResult) {
  const note = readPath(pack, 'ai.busy') || "Assistant is busy, here's a quick answer."
  if (!result.reply.includes(note)) result.reply = `${note}\n\n${result.reply}`
  return result
}

export async function handleAssistant(_req: IncomingMessage, res: ServerResponse) {
  send(res, 200, { configured: Boolean(llmSettings().key) })
}

export async function handleChat(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'method' })
    return
  }
  const rawText = await readBody(req)
  if (rawText.length > MAX_BODY) {
    send(res, 413, { error: 'too large' })
    return
  }
  if (rateLimited(`chat:${clientIp(req)}`, CHAT_PER_MINUTE)) {
    send(res, 429, { error: 'rate_limited' })
    return
  }
  let raw: ChatBody
  try {
    raw = JSON.parse(rawText || '{}') as ChatBody
  } catch {
    send(res, 400, { error: 'invalid json' })
    return
  }
  const messages = Array.isArray(raw.messages) ? raw.messages.slice(-MAX_MESSAGES) : []
  if (messages.length > MAX_MESSAGES || messages.some((message) => String(message?.content || '').length > MAX_MESSAGE)) {
    send(res, 400, { error: 'message too long' })
    return
  }
  const last = messages.filter((message) => message.role === 'user').at(-1)?.content ?? ''
  const pack = localePack(raw.language || 'en')
  const userTurns = messages.filter((message) => message.role === 'user').length
  const detail: 'short' | 'full' = raw.detail === 'short' ? 'short' : 'full'
  const demoInput = { message: last, detail, screen: raw.screen || 'app', userTurns }
  const secret = /password|\botp\b|\bpin\b|full card|card number|\d{13,}/i.test(last)
  if (secret) {
    send(res, 200, demoReply(pack, demoInput))
    return
  }
  const { key, baseURL, model, fallback } = llmSettings()
  if (!key) {
    if (raw.explain) {
      send(res, 200, explainPayload(pack, raw.labels || '', raw.screen || 'home'))
      return
    }
    send(res, 200, attachTask(demoReply(pack, demoInput), last, raw.payees || []))
    return
  }
  const balances = Array.isArray(raw.accounts)
    ? raw.accounts.map((account) => `${account.name} S$${Number(account.balance).toFixed(2)}`).join('; ')
    : ''
  const detailLine = raw.detail === 'short' ? 'Use 1 or 2 short sentences.' : 'Use 2 or 3 short sentences.'
  const cantonese = raw.dialect === 'cantonese' ? ' The customer prefers Cantonese. Write the reply in Cantonese.' : ''
  const system = [
    'You are Ollie, a warm and patient OCBC assistant for older and first-time digital banking customers. Use short sentences and explain jargon in plain words.',
    `Reply in the language of the user's latest message. If that language is unclear, reply in ${raw.languageName || 'English'}.${cantonese} ${detailLine}`,
    'You may answer everyday questions in 2 or 3 sentences, then offer related banking help only if it fits naturally.',
    'Refuse harmful, illegal, medical, legal advice and personal investment recommendations.',
    'Never ask for or reveal passwords, OTPs, PINs or card numbers.',
    'Never invent real OCBC rates, fees or balances. If you mention a rate or fee from this demo, call it sample data.',
    'When the user wants to pay, transfer, pay a bill, set up GIRO, save toward a goal, or lock a card, fill action with the intent and any fields you heard. You never complete a payment.',
    'Set scamRisk to high if they mention a call from the police or government, a job, an investment, or promised returns. Set scamRisk to check for a first overseas transfer, a new payee, or an amount over 1000. Otherwise none.',
    'Set handover to true if they ask for a person, seem stuck, or a scam is suspected.',
    'Do not put button labels such as "Guide me step by step" in the reply. Put up to 3 short follow-up phrases, in the same language as the reply, in suggestions.',
    raw.explain ? `Explain the current screen in 2 or 3 sentences using these visible labels and sample values: ${raw.labels || raw.screen || 'home'}.` : '',
    `Current screen: ${raw.screen || 'unknown'}. Current step: ${raw.step || 'none'}.`,
    balances ? `Sample balances: ${balances}. Say they are sample figures.` : '',
    'Return only JSON with keys reply, action (or null), scamRisk, suggestions, handover. action is { intent, fields } or null. intent is paynow, transfer, overseas, bill, giro, goal, or card-lock. fields is an object of strings.',
  ].filter(Boolean).join(' ')
  const chatMessages = [
    { role: 'system' as const, content: system },
    ...messages.map((message) => ({ role: message.role, content: String(message.content).slice(0, MAX_MESSAGE) })),
  ]
  const replyLanguage = answerLanguage(last, raw.language || 'en')
  const busyPack = localePack(replyLanguage)
  const detected = raw.explain ? { action: null, scamRisk: 'none' as const, handover: false } : detectTask(last, raw.payees || [])
  const finish = (text: string, source: 'llm' | 'demo') => {
    const parsed = parseModelReply(text)
    const flags = stripFlags(parsed?.reply || text)
    const demo = demoReply(busyPack, demoInput)
    let action = parsed?.action ?? null
    if (!action && detected.action) action = detected.action
    let scamRisk = strongerRisk(parsed?.scamRisk || 'none', detected.scamRisk)
    if (scamRisk === 'high') action = null
    const handover = Boolean(parsed?.handover) || detected.handover || (userTurns >= 3 && /stuck|don't understand|不懂|不明白|help me/i.test(last))
    const journeyId = flags.refused || scamRisk === 'high' ? null : journeyFor(last, action?.intent || demo.intent)
    const suggestions = (parsed?.suggestions || []).map((item) => item.trim()).filter(Boolean).slice(0, 3)
    return {
      reply: flags.reply.replace(/guide me step by step/gi, '').trim() || demo.reply,
      source,
      journeyId,
      action,
      scamRisk,
      suggestions,
      handover,
      flags: { refused: flags.refused, escalated: handover || flags.escalated, fraud: flags.fraud || scamRisk === 'high' },
    }
  }
  try {
    const text = await completeModel(key, baseURL, model, chatMessages)
    if (!text.trim()) throw new Error('empty reply')
    send(res, 200, finish(text, 'llm'))
  } catch (err) {
    console.error('chat failed', model, err instanceof Error ? err.message : err)
    if (fallback && fallback !== model) {
      try {
        const text = await completeModel(key, baseURL, fallback, chatMessages)
        if (!text.trim()) throw new Error('empty reply')
        send(res, 200, finish(text, 'llm'))
        return
      } catch (fallbackErr) {
        console.error('chat fallback failed', fallback, fallbackErr instanceof Error ? fallbackErr.message : fallbackErr)
      }
    }
    if (raw.explain) {
      const local = explainPayload(busyPack, raw.labels || '', raw.screen || 'home')
      const note = readPath(busyPack, 'ai.busy') || ''
      if (note) local.reply = `${note}\n\n${local.reply}`
      send(res, 200, local)
      return
    }
    const local = withBusyNote(busyPack, demoReply(busyPack, demoInput))
    send(res, 200, attachTask(local, last, raw.payees || []))
  }
}

function explainPayload(pack: Record<string, unknown>, labels: string, screen: string) {
  const template = readPath(pack, 'ai.explainFallback') || 'This screen is {screen}. You can see: {labels}. The figures are samples.'
  return {
    reply: template.replaceAll('{screen}', screen).replaceAll('{labels}', labels || screen),
    source: 'demo' as const,
    journeyId: null,
    action: null,
    scamRisk: 'none' as const,
    suggestions: [],
    handover: false,
    flags: { refused: false, escalated: false, fraud: false },
  }
}

function answerLanguage(text: string, fallback: string) {
  if (/[\u0b80-\u0bff]/.test(text)) return 'ta'
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh'
  if (/[A-Za-z]/.test(text) && !/[^\u0000-\u007f]/.test(text)) return 'en'
  return fallback
}

async function completeModel(key: string, baseURL: string, model: string, messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) {
  const client = new OpenAI({ apiKey: key, baseURL, timeout: 15000, maxRetries: 0 })
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.4,
    messages,
  })
  const content = completion.choices[0]?.message?.content as unknown
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : String((part as { text?: string })?.text || ''))).join('')
  }
  return ''
}

export function handleHealth(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    send(res, 405, { error: 'method' })
    return
  }
  send(res, 200, {
    LLM_API_KEY: Boolean(process.env.LLM_API_KEY || process.env.OPENAI_API_KEY),
    LLM_BASE_URL: Boolean(process.env.LLM_BASE_URL),
    LLM_MODEL: Boolean(process.env.LLM_MODEL),
    AZURE_SPEECH_KEY: Boolean(process.env.AZURE_SPEECH_KEY),
    AZURE_SPEECH_REGION: Boolean(process.env.AZURE_SPEECH_REGION),
  })
}
