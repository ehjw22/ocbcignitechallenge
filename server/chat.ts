import type { IncomingMessage, ServerResponse } from 'node:http'
import OpenAI from 'openai'
import { demoReply, journeyFor, type DemoResult } from './assistant'
import { llmSettings } from './env'
import { clientIp, readBody, send } from './http'
import { rateLimited } from './limit'
import { localePack, readPath } from './locales'

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
  const { key, baseURL, model } = llmSettings()
  const busy = () => withBusyNote(pack, demoReply(pack, demoInput))
  if (!key) {
    send(res, 200, busy())
    return
  }
  const detailLine = raw.detail === 'short' ? 'short and simple' : 'full detail'
  const system = [
    'You are the OCBC Adaptive in-app banking assistant in a demo app. Only help with banking and using this app: accounts, transfers, PayNow, GIRO, bills, cards, savings, fees, security and scams, and the current screen.',
    `Always reply only in ${raw.languageName || 'English'}. Do not add an English sentence about which screen the user is on. Use ${detailLine} detail, in plain friendly words, explaining banking terms simply.`,
    'If a question is not about banking or this app, politely say you can only help with banking and suggest what you can do.',
    'Never ask for or reveal passwords, OTPs, PINs or full card numbers.',
    "Never invent account data, rates or fees; say you're not sure and offer to contact staff.",
    "Offer 'Guide me step by step' when the user wants to do a task.",
    'Suggest contacting staff when the user asks for a person, is still stuck after two tries, or mentions fraud, scams, disputes or a lost card.',
    'For suspected fraud or a lost card, also show the 24-hour hotline +65 6363 3333 and the option to lock the card immediately.',
    `Current screen: ${raw.screen || 'unknown'}. Current step: ${raw.step || 'none'}.`,
    'Balances in the app are samples. Do not say a payment reached a real bank, and do not call the app a prototype.',
    'If you refuse an off-topic question, start with [[REFUSE]]. If you escalate to a person, start with [[ESCALATE]]. If this is fraud, a scam, a dispute or a lost card, start with [[FRAUD]]. Then write the customer-facing reply. Do not mention these markers.',
  ].join(' ')
  try {
    const client = new OpenAI({ apiKey: key, baseURL })
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        { role: 'system', content: system },
        ...messages.map((message) => ({ role: message.role, content: String(message.content).slice(0, MAX_MESSAGE) })),
      ],
    })
    const text = completion.choices[0]?.message?.content || ''
    if (!text.trim()) throw new Error('empty reply')
    const flags = stripFlags(text)
    const journeyId = flags.refused || flags.fraud ? null : journeyFor(last, demoReply(pack, demoInput).intent)
    send(res, 200, { reply: flags.reply, source: 'llm', journeyId, flags: { refused: flags.refused, escalated: flags.escalated, fraud: flags.fraud } })
  } catch {
    send(res, 200, busy())
  }
}
