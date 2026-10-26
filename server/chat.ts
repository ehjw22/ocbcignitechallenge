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
      send(res, 200, explainPayload(raw.dialect === 'cantonese' ? 'yue' : (raw.language || 'en'), raw.screen || 'home'))
      return
    }
    send(res, 200, attachTask(demoReply(pack, demoInput), last, raw.payees || []))
    return
  }
  const balances = Array.isArray(raw.accounts)
    ? raw.accounts.map((account) => `${account.name} S$${Number(account.balance).toFixed(2)}`).join('; ')
    : ''
  const detailLine = raw.detail === 'short' ? 'Use 1 or 2 short sentences.' : 'Use 2 or 3 short sentences.'
  const languageRule = raw.dialect === 'cantonese'
    ? 'Write every word in spoken Cantonese, using Traditional Chinese characters such as 呢個, 唔好, 而家. Do not write English or Mandarin.'
    : `Write every word in ${raw.languageName || 'English'}. Do not switch language.`
  const system = [
    'You are Ollie, a warm and patient OCBC assistant for older and first-time digital banking customers. Use short sentences and explain jargon in plain words.',
    `${languageRule} ${detailLine}`,
    'You may answer everyday questions in 2 or 3 sentences, then offer related banking help only if it fits naturally.',
    'Refuse harmful, illegal, medical, legal advice and personal investment recommendations.',
    'Never ask for or reveal passwords, OTPs, PINs or card numbers.',
    'Never invent real OCBC rates, fees or balances. If you mention a rate or fee from this demo, call it sample data.',
    'When the user wants to pay, transfer, pay a bill, set up GIRO, save toward a goal, or lock a card, fill action with the intent and any fields you heard. You never complete a payment.',
    'Set scamRisk to high if they mention a call from the police or government, a job, an investment, or promised returns. Set scamRisk to check for a first overseas transfer, a new payee, or an amount over 1000. Otherwise none.',
    'Set handover to true if they ask for a person, seem stuck, or a scam is suspected.',
    'Do not put button labels such as "Guide me step by step" in the reply. Put up to 3 short follow-up phrases, in the same language as the reply, in suggestions.',
    raw.explain ? `The customer asked what this screen is. Screen id: ${raw.screen || 'home'}. Explain that screen in plain words. Do not list button labels, icons, or symbols.` : '',
    `Current screen: ${raw.screen || 'unknown'}. Current step: ${raw.step || 'none'}.`,
    balances ? `Sample balances: ${balances}. Say they are sample figures.` : '',
    'Return only JSON with keys reply, action (or null), scamRisk, suggestions, handover. action is { intent, fields } or null. intent is paynow, transfer, overseas, bill, giro, goal, or card-lock. fields is an object of strings.',
  ].filter(Boolean).join(' ')
  const chatMessages = raw.explain
    ? [{
        role: 'system' as const,
        content: `You are Ollie, an OCBC assistant. ${languageRule} The customer is on the ${raw.screen || 'home'} screen. Explain that screen in two short sentences. Do not list labels, icons, or symbols. Return only JSON {"reply":"...","action":null,"scamRisk":"none","suggestions":[],"handover":false}.`,
      }, {
        role: 'user' as const,
        content: last || 'What is this?',
      }]
    : [
        { role: 'system' as const, content: system },
        ...messages.map((message) => ({ role: message.role, content: String(message.content).slice(0, MAX_MESSAGE) })),
      ]
  const replyLanguage = raw.dialect === 'cantonese' ? 'zh' : (raw.language || answerLanguage(last, 'en'))
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
  const primaryController = new AbortController()
  const primaryUnresponsive = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'].includes(model)
  if (primaryUnresponsive) console.error('chat model not responding', model, 'using', fallback || model)
  const primaryPromise = primaryUnresponsive
    ? Promise.resolve(new Error('primary skipped'))
    : completeModel(key, baseURL, model, chatMessages, false, 12000, primaryController.signal).catch((err: unknown) => err)
  try {
    const raced = primaryUnresponsive
      ? new Error('primary skipped')
      : await Promise.race([
          primaryPromise,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('primary timed out')), 4500)),
        ])
    if (typeof raced !== 'string' || !raced.trim()) throw raced instanceof Error ? raced : new Error('empty reply')
    send(res, 200, finish(raced, 'llm'))
  } catch (err) {
    primaryController.abort()
    console.error('chat failed', model, errorDetail(err))
    if (fallback && fallback !== model) {
      try {
        const text = await completeModel(key, baseURL, fallback, chatMessages, true, 15000)
        if (!text.trim()) throw new Error('empty reply')
        send(res, 200, finish(text, 'llm'))
        return
      } catch (fallbackErr) {
        console.error('chat fallback failed', fallback, errorDetail(fallbackErr))
      }
    }
    if (raw.explain) {
      send(res, 200, explainPayload(raw.dialect === 'cantonese' ? 'yue' : replyLanguage, raw.screen || 'home'))
      return
    }
    const local = withBusyNote(busyPack, demoReply(busyPack, demoInput))
    send(res, 200, attachTask(local, last, raw.payees || []))
  }
}

const SCREEN_COPY: Record<string, { en: string; zh: string; yue: string }> = {
  home: {
    en: 'This is your home screen. It shows a sample balance, the shortcuts you chose, a tip, and your latest sample transactions.',
    zh: '这是首页。这里有示例余额、你选好的快捷方式、一条提示，以及最近的示例交易。',
    yue: '呢個係主頁。你會見到示例結餘、你揀咗嘅快捷方式、一項提示，同最近嘅示例交易。',
  },
  accounts: {
    en: 'This is your accounts screen. It lists your sample accounts and the latest sample transactions.',
    zh: '这是账户页。这里列出示例账户和最近的示例交易。',
    yue: '呢個係戶口頁。呢度有示例戶口同最近嘅示例交易。',
  },
  overseas: {
    en: 'This is an overseas transfer. You enter who you are paying, the country, and the amount. Nothing is sent until you review it and enter your PIN. The rate shown is sample data.',
    zh: '这是海外转账。你要填写收款人、国家和金额。核对并输入 PIN 之前，钱不会汇出。页面上的汇率是示例。',
    yue: '呢個係海外轉賬。你要填收款人、國家同金額。你核對並輸入 PIN 之前，錢唔會匯出。頁面上嘅匯率係示例。',
  },
  paynow: {
    en: 'This is PayNow. You pay someone with a mobile number, then check their name and the amount before you confirm.',
    zh: '这是 PayNow。你用手机号付款，确认前要核对姓名和金额。',
    yue: '呢個係 PayNow。你用電話號碼付款，確認之前要核對姓名同金額。',
  },
  settings: {
    en: 'This is Settings. You can change the language, text size, colours, and whether screens are read aloud.',
    zh: '这是设置。你可以改语言、文字大小、颜色，以及是否朗读页面。',
    yue: '呢個係設定。你可以改語言、字體大細、顏色，同埋係咪要讀出嚟。',
  },
}

function explainPayload(language: string, screen: string) {
  const key = screen.includes('overseas') ? 'overseas' : screen.includes('paynow') ? 'paynow' : screen.includes('account') ? 'accounts' : screen.includes('setting') ? 'settings' : 'home'
  const copy = SCREEN_COPY[key]
  const reply = language === 'yue' ? copy.yue : language.startsWith('zh') ? copy.zh : copy.en
  return {
    reply,
    source: 'demo' as const,
    journeyId: null,
    action: null,
    scamRisk: 'none' as const,
    suggestions: [],
    handover: false,
    flags: { refused: false, escalated: false, fraud: false },
  }
}

function errorDetail(err: unknown) {
  if (!err || typeof err !== 'object') return String(err)
  const record = err as { status?: number; message?: string; code?: string }
  return [record.status || record.code || '', record.message || ''].filter(Boolean).join(' ')
}

function shouldRetry(err: unknown) {
  const status = (err as { status?: number })?.status
  return status === 503 || status === 429
}

function answerLanguage(text: string, fallback: string) {
  if (/[\u0b80-\u0bff]/.test(text)) return 'ta'
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh'
  if (/[A-Za-z]/.test(text) && !/[^\u0000-\u007f]/.test(text)) return 'en'
  return fallback
}

async function completeModel(
  key: string,
  baseURL: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  retry = true,
  timeout = 8000,
  signal?: AbortSignal,
) {
  const client = new OpenAI({ apiKey: key, baseURL, timeout, maxRetries: 0 })
  const once = async () => {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      messages,
    }, { signal })
    const content = completion.choices[0]?.message?.content as unknown
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content.map((part) => (typeof part === 'string' ? part : String((part as { text?: string })?.text || ''))).join('')
    }
    return ''
  }
  try {
    return await once()
  } catch (err) {
    if (signal?.aborted) throw err
    const status = (err as { status?: number })?.status
    console.error('chat attempt failed', model, errorDetail(err))
    if (retry && status !== 404 && shouldRetry(err)) {
      console.error('chat retrying', model)
      await new Promise((resolve) => setTimeout(resolve, 1200))
      return once()
    }
    throw err
  }
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
