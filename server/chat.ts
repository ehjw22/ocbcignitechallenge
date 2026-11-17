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

function withBusyNote(_pack: Record<string, unknown>, result: DemoResult) {
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
  const selectedLanguage = raw.language || 'en'
  const writtenYue = (selectedLanguage === 'zh-TW' || selectedLanguage === 'zh-HK') && raw.dialect === 'cantonese'
  const askedMalay = /\b(saya|nak|macam|mana|tidak|boleh|pindahan|wang|tolong)\b/i.test(last)
  const pack = localePack(askedMalay ? 'ms' : writtenYue ? 'zh-TW' : selectedLanguage)
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
      send(res, 200, explainPayload(writtenYue ? 'yue' : askedMalay ? 'ms' : selectedLanguage, raw.screen || 'home'))
      return
    }
    send(res, 200, attachTask(demoReply(pack, demoInput), last, raw.payees || []))
    return
  }
  const balances = Array.isArray(raw.accounts)
    ? raw.accounts.map((account) => `${account.name} S$${Number(account.balance).toFixed(2)}`).join('; ')
    : ''
  const detailLine = raw.detail === 'short' ? 'Use 1 or 2 short sentences.' : 'Use 2 or 3 short sentences.'
  const languageRule = askedMalay
    ? 'Write every word in Malay. Do not answer in English.'
    : writtenYue
    ? 'Write every word in spoken Cantonese, using Traditional Chinese characters such as 呢個, 唔好, 而家. Do not write English, Simplified Chinese, or Mandarin.'
    : selectedLanguage === 'zh'
      ? 'The screen language is Simplified Chinese. Write every word in Simplified Chinese. Dialect only chooses the voice, so do not write Cantonese or Traditional characters.'
      : selectedLanguage === 'zh-TW'
        ? 'Write every word in Traditional Chinese. Do not use Simplified characters or English.'
        : `Write every word in ${raw.languageName || 'English'}. If the customer writes in another language, answer in that language.`
  const system = [
    'You are Ollie, a warm and patient OCBC assistant for older and first-time digital banking customers. Use short sentences and explain jargon in plain words.',
    'This app has its own Settings, Text and display (text size 16–24, bold, high contrast), Language and voice, Read aloud, and Colours. Never tell users to use phone settings.',
    'Payments use slide to pay and a one-time code, never a PIN. Loans and investments are under More, not Plan. Format money as S$1,230.55. If the question is not about this bank, say you can only help with banking here. Offer Show me how for a screen you know.',
    `${languageRule} ${detailLine}`,
    'Examples: "Who won the World Cup" or weather -> say you can only help with banking here, and offer a transfer or balance. "how do I lock my card" in any language -> answer in the user\'s language and say Cards, not Pay & Transfer. "hello" -> one short line, then offer banking help.',
    'Card lock is on the Cards screen. Loans, investments and insurance are under More. Plan is for goals and insights. Always put a space before an account name, such as "your FRANK Account".',
    'Refuse harmful, illegal, medical, legal advice and personal investment recommendations.',
    'Never ask for or reveal passwords, OTPs, PINs or card numbers.',
    'Never invent real OCBC rates, fees or balances. If you mention a rate or fee from this demo, call it sample data.',
    'When the user wants to pay, transfer, pay a bill, set up GIRO, save toward a goal, or lock a card, fill action with the intent and any fields you heard. You never complete a payment.',
    'Set scamRisk to high only when the customer describes a scam, such as a prize they must pay for first, police, customs, a job offer, or an investment. A normal request to send money, including to their son, is scamRisk none. Set scamRisk to check only when the amount is over 1000 or the transfer is overseas to someone who is not a saved payee. Otherwise none.',
    'The real menu is Home, Plan, Pay & Transfer, Rewards, More. In Chinese the Pay & Transfer tab is 转账与付款. Rewards shows a demo balance of 1,280 OCBC$ and view-only vouchers; nothing can be redeemed. Under Pay & Transfer the items are Scan, PayNow, Local transfer, Overseas transfer, Pay a bill, Set up GIRO, Savings goal, Lock or unlock a card, Report a lost card, and Transfer limit. Statements are View Statement on the account page, which opens /info/statements. Money Lock is /info/money-lock, not the card lock. There is no eStatements path. If someone wants to send money to a son or family member, ask which country they are in and mention Overseas transfer. Never invent a fee or a payee the customer does not have.',
    'Mention a sample rate only when the task is an overseas transfer or foreign exchange.',
    'Set handover to true if they ask for a person, seem stuck, or a scam is suspected.',
    'For a possible scam, tell them to call the ScamShield Helpline 1799 (free, 24/7). For a lost or stolen card, tell them to call +65 6363 3333. Do not swap those numbers.',
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
  const replyLanguage = askedMalay ? 'ms' : writtenYue ? 'zh-TW' : selectedLanguage
  const busyPack = localePack(replyLanguage)
  const detected = raw.explain ? { action: null, scamRisk: 'none' as const, handover: false } : detectTask(last, raw.payees || [])
  const finish = (text: string, source: 'llm' | 'demo') => {
    const parsed = parseModelReply(text)
    const flags = stripFlags(parsed?.reply || text)
    const demo = demoReply(busyPack, demoInput)
    let action = parsed?.action ?? null
    if (!action && detected.action) action = detected.action
    let scamRisk = strongerRisk(parsed?.scamRisk || 'none', detected.scamRisk)
    if (scamRisk === 'high' || /system\s*override|ignore previous|ignore all/i.test(last)) action = null
    const asksStaff = /staff|职员|工作人员|stuck|don't understand|不懂|不明白|help me/i.test(last)
    const handover = Boolean(parsed?.handover) || detected.handover || asksStaff
    const journeyId = flags.refused || scamRisk === 'high' ? null : journeyFor(last, action?.intent || demo.intent)
    const suggestions = (parsed?.suggestions || []).map((item) => item.trim()).filter(Boolean).slice(0, 3)
    let reply = flags.reply.replace(/guide me step by step/gi, '').trim() || demo.reply
    if (scamRisk === 'high' && !/1799/.test(reply)) reply = `Stop. Don't transfer. Call ScamShield 1799. ${reply}`
    return {
      reply,
      source,
      journeyId,
      action,
      scamRisk,
      suggestions,
      handover,
      flags: { refused: flags.refused, escalated: handover || flags.escalated, fraud: flags.fraud || scamRisk === 'high' },
    }
  }
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  const emit = (payload: unknown) => res.write(`data: ${JSON.stringify(payload)}\n\n`)
  const models = [model, fallback].filter((item, index, list) => item && list.indexOf(item) === index)
  let produced = ''
  for (const [index, name] of models.entries()) {
    try {
      produced = await streamModel(key, baseURL, name, chatMessages, (full) => emit({ text: full }), index > 0, index === 0 ? 8000 : 8000)
      if (produced.trim()) break
    } catch (err) {
      console.error(index === 0 ? 'chat failed' : 'chat fallback failed', name, errorDetail(err))
    }
  }
  if (!produced.trim()) {
    const local = raw.explain
      ? explainPayload(writtenYue ? 'yue' : replyLanguage, raw.screen || 'home')
      : attachTask(withBusyNote(busyPack, demoReply(busyPack, demoInput)), last, raw.payees || [])
    const offline = replyLanguage.startsWith('zh') ? 'Ollie 处于离线模式，回答有限。' : 'Ollie is in offline mode, answers are limited.'
    emit({ text: `${local.reply} ${offline}`, done: { ...local, reply: `${local.reply} ${offline}` } })
    res.end()
    return
  }
  emit({ text: produced, done: finish(produced, 'llm') })
  res.end()
}

const SCREEN_COPY: Record<string, { en: string; zh: string; hant: string; yue: string }> = {
  home: {
    en: 'This is your home screen. It shows a sample balance, the shortcuts you chose, a tip, and your latest sample transactions.',
    zh: '这是首页。这里有示例余额、你选好的快捷方式、一条提示，以及最近的示例交易。',
    hant: '這是主頁。這裡有示例餘額、你選好的快捷方式、一項提示，以及最近的示例交易。',
    yue: '呢個係主頁。你會見到示例結餘、你揀咗嘅快捷方式、一項提示，同最近嘅示例交易。',
  },
  accounts: {
    en: 'This is your accounts screen. It lists your sample accounts and the latest sample transactions.',
    zh: '这是账户页。这里列出示例账户和最近的示例交易。',
    hant: '這是帳戶頁。這裡列出示例帳戶和最近的示例交易。',
    yue: '呢個係戶口頁。呢度有示例戶口同最近嘅示例交易。',
  },
  overseas: {
    en: 'This is an overseas transfer. You enter who you are paying, the country, and the amount. Nothing is sent until you review it and enter your PIN. The rate shown is sample data.',
    zh: '这是海外转账。你要填写收款人、国家和金额。核对并输入 PIN 之前，钱不会汇出。页面上的汇率是示例。',
    hant: '這是海外轉賬。你要填寫收款人、國家和金額。核對並輸入 PIN 之前，錢不會匯出。頁面上的匯率是示例。',
    yue: '呢個係海外轉賬。你要填收款人、國家同金額。你核對並輸入 PIN 之前，錢唔會匯出。頁面上嘅匯率係示例。',
  },
  paynow: {
    en: 'This is PayNow. You pay someone with a mobile number, then check their name and the amount before you confirm.',
    zh: '这是 PayNow。你用手机号付款，确认前要核对姓名和金额。',
    hant: '這是 PayNow。你用手機號碼付款，確認前要核對姓名和金額。',
    yue: '呢個係 PayNow。你用電話號碼付款，確認之前要核對姓名同金額。',
  },
  settings: {
    en: 'This is Settings. You can change the language, text size, colours, and whether screens are read aloud.',
    zh: '这是设置。你可以改语言、文字大小、颜色，以及是否朗读页面。',
    hant: '這是設定。你可以改語言、文字大小、顏色，以及是否朗讀頁面。',
    yue: '呢個係設定。你可以改語言、字體大細、顏色，同埋係咪要讀出嚟。',
  },
}

function explainPayload(language: string, screen: string) {
  const key = screen.includes('overseas') ? 'overseas' : screen.includes('paynow') ? 'paynow' : screen.includes('account') ? 'accounts' : screen.includes('setting') ? 'settings' : 'home'
  const copy = SCREEN_COPY[key]
  const reply = language === 'yue' ? copy.yue : language === 'zh-TW' ? copy.hant : language.startsWith('zh') ? copy.zh : copy.en
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

function textOf(content: unknown) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content.map((part) => (typeof part === 'string' ? part : String((part as { text?: string })?.text || ''))).join('')
  }
  return ''
}

async function streamModel(
  key: string,
  baseURL: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  onText: (full: string) => void,
  retry: boolean,
  timeout: number,
) {
  const client = new OpenAI({ apiKey: key, baseURL, timeout, maxRetries: 0 })
  const once = async () => {
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 180,
        messages,
        stream: true,
      })
      let full = ''
      for await (const chunk of completion) {
        const piece = textOf(chunk.choices[0]?.delta?.content)
        if (!piece) continue
        full += piece
        onText(full)
      }
      return full
    } catch (err) {
      const status = (err as { status?: number })?.status
      if (status === 404) throw err
      const completion = await client.chat.completions.create({ model, temperature: 0.3, messages })
      const full = textOf(completion.choices[0]?.message?.content)
      if (full) onText(full)
      return full
    }
  }
  try {
    return await once()
  } catch (err) {
    console.error('chat attempt failed', model, errorDetail(err))
    if (retry && shouldRetry(err)) {
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
