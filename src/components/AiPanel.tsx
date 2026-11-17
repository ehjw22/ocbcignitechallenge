import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Info, Mic, Send } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { FX } from '@/data/bank'
import { translate } from '@/i18n'
import { formatSGD } from '@/lib/format'
import {
  clampVoiceTransferLimit,
  formatVoiceTransferAmount,
  isEmptyVoiceTranscript,
  parseVoiceAffirmation,
  resolveVoiceTransfer,
  voiceTransferFields,
  type VoiceTransferOutcome,
} from '@/lib/voiceTransfer'
import { languageById } from '@/lib/languages'
import { journeyRoute, queueShowHow } from '@/lib/showHow'
import { prefetchSpeech, speak, stopSpeaking } from '@/lib/speech'
import { assessChatRisk, buildChatReview, transferExpired } from '@/lib/chatTransfer'
import { normaliseFillFields } from '@/lib/fillFields'
import type { ChatAction, ChatMessage, VoiceTransferCard } from '@/lib/types'
import { visibleReply } from '@/lib/chatReply'
import { getFlowTour } from '@/lib/guide'
import { ChatTransferMessage } from './ChatTransferMessage'
import { RichText, plainSpeech } from './RichText'
import { Speakable } from './Speakable'

const CHIP_KEYS = ['ai.chipVoiceJohn', 'ai.chipBalance', 'ai.chipPaynow', 'ai.chipGiro', 'ai.chipHow', 'ai.chipScam']
const FOLLOW = ['ai.chipSimpler', 'ai.chipTours', 'ai.chipStaff'] as const
const PENDING_VOICE_TRANSFER = new Set(['sendReady', 'scamQuiz'])

function journeyFor(screen: string) {
  if (screen.includes('overseas')) return 'overseas'
  if (screen.includes('transfer')) return 'transfer'
  if (screen.includes('bill')) return 'bill'
  if (screen.includes('giro')) return 'giro'
  if (screen.includes('goal')) return 'goal'
  if (screen.includes('card')) return 'card-lock'
  if (screen.includes('limit') || screen.includes('settings') || screen.includes('text') || screen.includes('language')) return 'settings'
  return 'paynow'
}

function chipsFor(screen: string) {
  if (screen.includes('overseas')) return ['ai.chipOverseas', 'ai.chipHow', 'ai.chipScam']
  if (screen.includes('giro')) return ['ai.chipGiro', 'ai.chipHow', 'ai.chipBalance']
  if (screen.includes('limit')) return ['ai.chipLimit', 'ai.chipHow', 'ai.chipBalance']
  if (screen.includes('paynow') || screen.includes('scan')) return ['ai.chipPaynow', 'ai.chipHow', 'ai.chipScam']
  return CHIP_KEYS
}

function speechLang(language: string, dialect: string) {
  if ((language === 'zh' || language === 'zh-TW') && dialect === 'cantonese') return 'zh-HK'
  return languageById(language).bcp47
}

async function readChatStream(res: Response, onText: (text: string) => void): Promise<ChatMessage & { reply?: string }> {
  const reader = res.body?.getReader()
  if (!reader) throw new Error('chat')
  const decoder = new TextDecoder()
  let buffer = ''
  let donePayload: (ChatMessage & { reply?: string }) | null = null
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    buffer += decoder.decode(chunk.value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    for (const part of parts) {
      const line = part.split('\n').find((item) => item.startsWith('data: '))
      if (!line) continue
      const payload = JSON.parse(line.slice(6)) as { text?: string; done?: ChatMessage & { reply?: string } }
      if (payload.text) {
        const shown = visibleReply(payload.text)
        if (shown) onText(shown)
      }
      if (payload.done) donePayload = payload.done
    }
  }
  return donePayload || { role: 'assistant', content: '', reply: '' }
}

function confirmCopy(action: ChatAction, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (action.intent === 'overseas') {
    const fx = FX[action.fields.country] || FX.Australia
    const amount = Number(action.fields.amount || 0) || 500
    const received = Math.max(0, Math.round((amount - fx.fee) * fx.perSgd))
    return t('ai.confirmOverseas', {
      amount: formatSGD(amount),
      name: action.fields.name || 'Tan Wei Ming',
      country: action.fields.country || 'Australia',
      fee: formatSGD(fx.fee),
      received: `${t(fx.currencyKey)} ${received}`,
    })
  }
  if (action.intent === 'card-lock') return t('ai.confirmCardLock')
  const taskKey = `ai.task.${action.intent}`
  const task = t(taskKey)
  return t('ai.confirmGeneric', { task: task === taskKey ? action.intent : task })
}

function OllieAvatar() {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)]">
        O
      </span>
    )
  }
  return <img src="/ollie-avatar.png" alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" onError={() => setFailed(true)} />
}

export function AiPanel() {
  const app = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)
  const [about, setAbout] = useState(false)
  const [listening, setListening] = useState(false)
  const [live, setLive] = useState('')
  const [paused, setPaused] = useState<Record<number, boolean>>({})
  const [answers, setAnswers] = useState<Record<number, Array<'yes' | 'no' | null>>>({})
  const [cancelled, setCancelled] = useState<Record<number, boolean>>({})
  const [summaries, setSummaries] = useState<Record<number, string>>({})
  const [chatScam, setChatScam] = useState<Record<number, Array<'yes' | 'no' | null>>>({})
  const scroller = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const pendingPayee = useRef<string | null>(null)
  const voiceFailCount = useRef(0)
  const heardFinal = useRef(false)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const helpWasOpen = useRef(app.helpOpen)
  const micOk = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [app.messages, busy, slow])

  useEffect(() => {
    const timer = window.setInterval(() => {
      app.setMessages((prev) => {
        let changed = false
        const next = prev.map((message) => {
          const card = message.voiceTransfer
          if (!card?.createdAt || card.kind === 'receipt' || card.kind === 'expired' || card.kind === 'transferError') return message
          if (transferExpired(card.createdAt)) {
            changed = true
            return { ...message, voiceTransfer: { ...card, kind: 'expired' as const } }
          }
          return message
        })
        return changed ? next : prev
      })
    }, 15000)
    return () => window.clearInterval(timer)
  }, [app])

  useEffect(() => {
    if (helpWasOpen.current && !app.helpOpen) {
      setCancelled((prev) => {
        const next = { ...prev }
        app.messages.forEach((message, index) => {
          const kind = message.voiceTransfer?.kind
          if (kind && PENDING_VOICE_TRANSFER.has(kind)) next[index] = true
        })
        return next
      })
    }
    helpWasOpen.current = app.helpOpen
  }, [app.helpOpen, app.messages])

  useEffect(() => {
    if (!busy) {
      setSlow(false)
      return
    }
    const timer = window.setTimeout(() => setSlow(true), 15000)
    return () => window.clearTimeout(timer)
  }, [busy])

  const practiceOn = () => new URLSearchParams(location.search).get('practice') === '1' || Boolean(getFlowTour())

  const openVoiceFlow = (flow: string, fields?: Record<string, string>) => {
    if (fields) sessionStorage.setItem('ocbc-fill', JSON.stringify({ flow, fields }))
    app.setHelpOpen(false)
    navigate(`/flow/${flow}${practiceOn() ? '?practice=1' : ''}`)
  }

  const openVoiceLimitSettings = () => {
    app.setHelpOpen(false)
    navigate('/settings?panel=language#voice-limit')
  }

  const speakReply = (text: string) => {
    setLive(text)
    const speechOptions = { language: app.prefs.language, rate: app.prefs.speechRate, dialect: app.prefs.dialect }
    prefetchSpeech(text, speechOptions)
    if (app.prefs.readAloud) void speak(text, speechOptions)
  }

  const stuckVoice = () => voiceFailCount.current >= 2

  const voiceCard = (outcome: VoiceTransferOutcome, stuck: boolean): VoiceTransferCard | undefined => {
    const extra = { stuck: stuck || undefined }
    if (outcome.type === 'confirm') {
      const practice = practiceOn()
      const review = buildChatReview(outcome.match)
      const risk = assessChatRisk(outcome.match, app.payees, app.profile.id, app.profile.usualTransfer, outcome.match.fields.reference)
      const kind = !practice && risk.level !== 'none' ? 'scamQuiz' : 'sendReady'
      return {
        kind,
        amount: outcome.amount,
        payeeName: outcome.payee.name,
        payeeId: outcome.payee.id,
        flow: outcome.match.flow,
        fields: outcome.match.fields,
        review: {
          payeeName: review.payeeName,
          payeeMasked: review.payeeMasked,
          fromAccountId: review.fromAccountId || app.accounts.find((account) => account.kind === 'deposit')?.id || 'frank',
          amount: review.amount,
        },
        createdAt: Date.now(),
        practice,
        riskLevel: risk.level === 'none' ? undefined : risk.level,
        ...extra,
      }
    }
    if (outcome.type === 'overLimit') {
      return { kind: 'overLimit', amount: outcome.amount, payeeName: outcome.payee.name, flow: outcome.match.flow, fields: outcome.match.fields, ...extra }
    }
    if (outcome.type === 'disabled') {
      return { kind: 'disabled', amount: outcome.amount, payeeName: outcome.payee?.name || outcome.query, flow: outcome.match?.flow || 'paynow', fields: outcome.match?.fields, ...extra }
    }
    if (outcome.type === 'suggest') {
      const fields = voiceTransferFields(outcome.payee, outcome.amount, undefined, app.accounts.find((account) => account.kind === 'deposit')?.id)
      return { kind: 'suggestPayee', amount: outcome.amount, payeeName: outcome.payee.name, payeeId: outcome.payee.id, query: outcome.query, flow: fields.flow, fields: fields.fields, ...extra }
    }
    if (outcome.type === 'choose') {
      return { kind: 'choosePayee', amount: outcome.amount, payeeName: outcome.query, payeeIds: outcome.payees.map((payee) => payee.id), query: outcome.query, ...extra }
    }
    if (outcome.type === 'noMatch') {
      return { kind: 'noMatchPayees', amount: outcome.amount, payeeName: outcome.query, payeeIds: app.payees.slice(0, 5).map((payee) => payee.id), query: outcome.query, ...extra }
    }
    if (outcome.type === 'askAmount') {
      pendingPayee.current = outcome.payee.name
      return { kind: 'askAmount', amount: 0, payeeName: outcome.payee.name, payeeId: outcome.payee.id, ...extra }
    }
    if (outcome.type === 'uncaught') return { kind: 'uncaught', amount: 0, payeeName: '', ...extra }
    return undefined
  }

  const voiceContent = (outcome: VoiceTransferOutcome) => {
    if (outcome.type === 'confirm') return t('ai.chatReviewIntro', { amount: formatSGD(outcome.amount), name: outcome.payee.name })
    if (outcome.type === 'overLimit') return t('ai.voiceOverLimit', { amount: formatVoiceTransferAmount(clampVoiceTransferLimit(app.prefs.voiceTransferLimit)) })
    if (outcome.type === 'disabled') return t('ai.voiceOff')
    if (outcome.type === 'askAmount') return t('ai.voiceAskAmount', { name: outcome.payee.name })
    if (outcome.type === 'suggest') return t('ai.voiceDidYouMean', { name: outcome.payee.name })
    if (outcome.type === 'choose') return t('ai.voiceWhoToPay')
    if (outcome.type === 'noMatch') return `${t('ai.voiceNoMatchPayees')}\n\n${t('ai.voiceSavedOnlyNote')}`
    if (outcome.type === 'uncaught') return t('ai.voiceUncaught')
    if (outcome.type === 'badAmount') return t('ai.voiceBadAmount')
    return t('ai.voiceUnknownPayee')
  }

  const replyFromOutcome = (outcome: VoiceTransferOutcome, bumpFail: boolean): ChatMessage => {
    if (bumpFail) voiceFailCount.current += 1
    else if (outcome.type === 'confirm') voiceFailCount.current = 0
    const stuck = stuckVoice()
    return { role: 'assistant', content: voiceContent(outcome), source: 'demo', voiceTransfer: voiceCard(outcome, stuck) }
  }

  const updateVoiceCard = (index: number, card: VoiceTransferCard) => {
    app.setMessages((prev) => prev.map((message, i) => (i === index ? { ...message, voiceTransfer: card } : message)))
  }

  const pickVoicePayee = (payeeId: string, amount: number) => {
    const payee = app.payees.find((item) => item.id === payeeId)
    if (!payee) return
    const from = app.accounts.find((account) => account.kind === 'deposit')?.id
    const limit = clampVoiceTransferLimit(app.prefs.voiceTransferLimit)
    const text = amount > 0 ? `transfer ${amount} to ${payee.name}` : `pay ${payee.name}`
    const outcome = resolveVoiceTransfer(text, app.payees, limit, from)
    if (outcome.type === 'notTransfer') return
    const local = replyFromOutcome(outcome, outcome.type === 'noMatch' || outcome.type === 'suggest')
    app.setMessages((prev) => {
      const next = [...prev, local]
      if (local.voiceTransfer && ['sendReady', 'scamQuiz'].includes(local.voiceTransfer.kind)) {
        setChatScam((current) => ({ ...current, [next.length - 1]: [null, null, null] }))
      }
      return next
    })
    speakReply(local.content)
  }

  const voiceReply = (text: string): ChatMessage | null => {
    const pending = [...app.messages].reverse().find((message) => message.role === 'assistant' && message.voiceTransfer)
    if (pending?.voiceTransfer?.kind === 'suggestPayee') {
      const answer = parseVoiceAffirmation(text)
      const payee = app.payees.find((item) => item.id === pending.voiceTransfer?.payeeId)
      if (answer === 'yes' && payee && pending.voiceTransfer.amount > 0) {
        const from = app.accounts.find((account) => account.kind === 'deposit')?.id
        const limit = clampVoiceTransferLimit(app.prefs.voiceTransferLimit)
        const outcome = resolveVoiceTransfer(`transfer ${pending.voiceTransfer.amount} to ${payee.name}`, app.payees, limit, from)
        if (outcome.type === 'confirm') return replyFromOutcome(outcome, false)
      }
      if (answer === 'no') {
        voiceFailCount.current += 1
        const stuck = stuckVoice()
        return {
          role: 'assistant',
          content: `${t('ai.voiceNoMatchPayees')}\n\n${t('ai.voiceSavedOnlyNote')}`,
          source: 'demo',
          voiceTransfer: { kind: 'noMatchPayees', amount: pending.voiceTransfer.amount, payeeName: pending.voiceTransfer.query || '', payeeIds: app.payees.slice(0, 5).map((item) => item.id), stuck },
        }
      }
    }
    const bareAmount = text.trim().match(/^(?:s\$|\$)?(\d+(?:\.\d{1,2})?)$/i)
    const waitingPayee = pendingPayee.current
    const parsedText = bareAmount && waitingPayee && Number(bareAmount[1]) > 0 ? `transfer ${bareAmount[1]} to ${waitingPayee}` : text
    if (bareAmount && waitingPayee) pendingPayee.current = null
    const limit = clampVoiceTransferLimit(app.prefs.voiceTransferLimit)
    const from = app.accounts.find((account) => account.kind === 'deposit')?.id
    const outcome = resolveVoiceTransfer(parsedText, app.payees, limit, from)
    if (outcome.type === 'notTransfer') return null
    const bump = ['uncaught', 'badAmount', 'noMatch', 'choose', 'suggest'].includes(outcome.type)
    return replyFromOutcome(outcome, bump)
  }

  const pushUncaught = () => {
    voiceFailCount.current += 1
    const local = replyFromOutcome({ type: 'uncaught' }, false)
    app.setMessages((prev) => [...prev, local])
    speakReply(local.content)
  }

  const ask = async (question: string, retry = false) => {
    const explain = question.startsWith('__explain__:')
    const text = explain ? t('ai.what') : question.trim()
    if (!text) return
    abortRef.current?.abort()
    if (!retry && !explain && isEmptyVoiceTranscript(text)) {
      pushUncaught()
      setDraft('')
      return
    }
    if (!retry && !explain) {
      const local = voiceReply(text)
      if (local) {
        app.setMessages((prev) => {
          const next = [...prev, { role: 'user' as const, content: text }, local]
          if (local.voiceTransfer && ['sendReady', 'scamQuiz'].includes(local.voiceTransfer.kind)) {
            setChatScam((current) => ({ ...current, [next.length - 1]: [null, null, null] }))
          }
          return next
        })
        app.setLastQuestion(text)
        app.log('ai_question', { question: text, screen: app.screen, voiceTransfer: Boolean(local.voiceTransfer) })
        setDraft('')
        if (box.current) box.current.style.height = 'auto'
        speakReply(local.content)
        return
      }
    }
    const nextHistory = retry ? app.messages : [...app.messages, { role: 'user' as const, content: text }]
    if (!retry) app.setMessages(nextHistory)
    app.setLastQuestion(text)
    if (!retry && !explain) app.log('ai_question', { question: text, screen: app.screen })
    setDraft('')
    if (box.current) box.current.style.height = 'auto'
    setBusy(true)
    setSlow(false)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const lang = languageById(app.prefs.language)
      const res = await fetch('/api/chat', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          language: app.prefs.language,
          languageName: app.prefs.language === 'zh' ? 'Simplified Chinese' : app.prefs.language === 'zh-TW' ? 'Traditional Chinese' : lang.english,
          detail: app.prefs.detail,
          dialect: app.prefs.language === 'zh' || app.prefs.language === 'zh-TW' ? app.prefs.dialect : 'standard',
          screen: app.screen,
          step: app.guideStep || app.step,
          explain,
          labels: explain ? question.slice('__explain__:'.length) : '',
          accounts: app.accounts.filter((account) => account.kind === 'deposit').map((account) => ({
            name: t(account.nameKey),
            balance: app.balances[account.id] ?? account.balance,
          })),
          payees: app.payees.map((payee) => ({ name: payee.name, country: payee.country, label: payee.label })),
        }),
      })
      if (!res.ok) throw new Error('chat')
      const streamed = (res.headers.get('content-type') || '').includes('text/event-stream')
      const data = streamed ? await readChatStream(res, (partial) => {
        app.setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.role === 'assistant' && last.source === 'llm') next[next.length - 1] = { ...last, content: partial }
          else next.push({ role: 'assistant', content: partial, source: 'llm' })
          return next
        })
      }) : (await res.json()) as ChatMessage & { reply?: string }
      const reply = app.prefs.language === 'zh-TW' ? toTraditional(data.reply || t('ai.faq.general.short')) : (data.reply || t('ai.faq.general.short')).replace(/yourFRANK/g, 'your FRANK')
      const flags = data.flags || {}
      if (flags.refused) app.log('ai_refused', { question: text, screen: app.screen, reason: 'refused' })
      if (flags.escalated || flags.fraud) app.log('ai_escalated', { reason: flags.fraud ? 'fraud' : 'staff', screen: app.screen })
      if (data.scamRisk === 'high') app.log('scam_check', { trigger: 'mentioned', result: 'paused', screen: app.screen })
      const message: ChatMessage = {
        role: 'assistant',
        content: reply,
        flags,
        source: data.source,
        journeyId: data.journeyId,
        action: data.action,
        scamRisk: data.scamRisk === 'check' && ['paynow', 'transfer', 'overseas', 'bill', 'scan'].includes(data.action?.intent || '') ? data.scamRisk : data.scamRisk === 'check' ? 'none' : data.scamRisk,
        suggestions: data.suggestions,
        handover: data.handover || flags.escalated,
      }
      app.setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant') next[next.length - 1] = message
        else next.push(message)
        return next
      })
      const spoken = plainSpeech(reply)
      setLive(spoken)
      const speechOptions = { language: app.prefs.language, rate: app.prefs.speechRate, dialect: app.prefs.dialect }
      prefetchSpeech(spoken, speechOptions)
      if (app.prefs.readAloud) void speak(spoken, speechOptions)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      app.setMessages((prev) => [...prev, { role: 'assistant', content: t('ai.faq.general.short'), source: 'demo' }])
    } finally {
      if (abortRef.current === controller) setBusy(false)
    }
  }

  useEffect(() => {
    if (!app.aiSeed) return
    const q = app.aiSeed
    app.setAiSeed('')
    void ask(q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.aiSeed])

  const toggleMic = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) return
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }
    heardFinal.current = false
    const rec = new Ctor()
    rec.lang = speechLang(app.prefs.language, app.prefs.dialect)
    rec.interimResults = true
    rec.onresult = (event) => {
      let said = ''
      let interim = ''
      let confidence = 1
      for (let i = 0; i < event.results.length; i += 1) {
        const bit = event.results[i]?.[0]?.transcript || ''
        if (event.results[i]?.isFinal) {
          said += bit
          confidence = Number((event.results[i]?.[0] as { confidence?: number } | undefined)?.confidence ?? confidence)
        } else interim += bit
      }
      const shown = (said || interim).trim()
      setDraft(shown)
      setLive(shown)
      if (said.trim()) {
        heardFinal.current = true
        if (confidence > 0 && confidence < 0.55) {
          pushUncaught()
          rec.stop()
          return
        }
        void ask(said.trim())
      }
    }
    rec.onerror = () => {
      pushUncaught()
    }
    rec.onend = () => {
      setListening(false)
      if (!heardFinal.current) pushUncaught()
    }
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  const fill = (action: ChatAction) => {
    const depositIds = app.accounts.filter((account) => account.kind === 'deposit').map((account) => account.id)
    const fields = normaliseFillFields(action.intent, action.fields, { payees: app.payees, depositIds })
    sessionStorage.setItem('ocbc-fill', JSON.stringify({ flow: action.intent, fields }))
    app.setHelpOpen(false)
    navigate(`/flow/${action.intent}`)
  }

  const answerScam = (index: number, slot: number, value: 'yes' | 'no', message: ChatMessage) => {
    const current = answers[index] || [null, null, null]
    const next = [...current]
    next[slot] = value
    setAnswers((prev) => ({ ...prev, [index]: next }))
    if (value === 'yes') {
      setPaused((prev) => ({ ...prev, [index]: true }))
      app.log('scam_check', { trigger: `q${slot + 1}`, result: 'paused', screen: app.screen, amountBand: Number(message.action?.fields.amount || 0) > 1000 ? 'over-1000' : 'under-1000' })
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center gap-2">
        <OllieAvatar />
        <h2 className="min-w-0 flex-1 text-lg font-semibold leading-snug">{t('ai.header')}</h2>
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)]" aria-label={t('ai.about')} onClick={() => setAbout(true)}>
          <Info aria-hidden size={20} />
        </button>
      </div>
      <div className="sr-only" aria-live="polite">{busy ? (slow ? t('ai.slow') : t('ai.typing')) : live}</div>
      <div ref={scroller} className="flex min-h-40 w-full flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden">
        {app.messages.length === 0 && (
          <article className="card flex max-w-[92%] gap-2 p-3">
            <OllieAvatar />
            <Speakable text={t('ai.greeting')} />
          </article>
        )}
        {app.messages.map((message, index) => {
          const scamAnswers = answers[index] || [null, null, null]
          const safe = scamAnswers.every((item) => item === 'no')
          const showCard = message.action && !paused[index] && !cancelled[index] && (message.scamRisk !== 'check' || safe)
          const summary = summaries[index] ?? [message.action?.intent || app.screen, app.screen, app.lastQuestion].filter(Boolean).join(' · ')
          return (
            <article key={`${message.role}-${index}`} className={message.role === 'user' ? 'ml-auto max-w-[85%] rounded-2xl bg-[var(--soft)] p-3' : 'card flex max-w-[92%] gap-2 p-3'}>
              {message.role === 'assistant' && <OllieAvatar />}
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-semibold">{message.role === 'user' ? t('you') : t('ai.title')}</p>
                {message.role === 'assistant' ? <RichText text={message.content} /> : <p>{message.content}</p>}
                {message.role === 'assistant' && <div className="mt-2"><Speakable text={plainSpeech(message.content)} hideText /></div>}
                {message.role === 'assistant' && message.scamRisk === 'check' && message.action && !paused[index] && !cancelled[index] && (
                  <div className="mt-3 space-y-2">
                    {(['ai.scamQ1', 'ai.scamQ2', 'ai.scamQ3'] as const).map((key, slot) => (
                      <div key={key}>
                        <p>{t(key)}</p>
                        <div className="mt-1 flex gap-2">
                          <button type="button" className="min-h-11 rounded-xl border border-[var(--line)] px-3 font-semibold" aria-pressed={scamAnswers[slot] === 'yes'} onClick={() => answerScam(index, slot, 'yes', message)}>{t('ai.scamYes')}</button>
                          <button type="button" className="min-h-11 rounded-xl border border-[var(--line)] px-3 font-semibold" aria-pressed={scamAnswers[slot] === 'no'} onClick={() => answerScam(index, slot, 'no', message)}>{t('ai.scamNo')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {(paused[index] || message.scamRisk === 'high') && message.role === 'assistant' && (
                  <div className="mt-3 space-y-2">
                    <p>{t('ai.scamPause')}</p>
                    <a className="phone-number block font-semibold text-[var(--link)]" href="tel:1799">{t('scamCheck.helpline')}</a>
                    <button type="button" className="min-h-11 rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={() => { setSummaries((prev) => ({ ...prev, [index]: summary })); app.setStaffSeed(summary); app.setHelpView('staff') }}>{t('ai.handoverLabel')}</button>
                  </div>
                )}
                {showCard && message.action && (
                  <div className="mt-3 space-y-2 rounded-xl border border-[var(--line)] p-3">
                    <p>{confirmCopy(message.action, t)}</p>
                    {message.action.intent === 'overseas' && <p className="text-sm text-[var(--muted)]">{t('ai.sampleRate')}</p>}
                    <button type="button" className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={() => fill(message.action as ChatAction)}>{t('ai.fillIn')}</button>
                    <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => { app.setHelpOpen(false); queueShowHow(message.action?.intent || message.journeyId || '', false); navigate(journeyRoute(message.action?.intent || '')) }}>{t('ai.chipHow')}</button>
                    <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => setCancelled((prev) => ({ ...prev, [index]: true }))}>{t('ai.cancelTask')}</button>
                  </div>
                )}
                {message.voiceTransfer && !cancelled[index] && (
                  <div className={['scamQuiz', 'sendReady', 'receipt', 'transferError', 'expired'].includes(message.voiceTransfer.kind) ? '' : 'mt-3 space-y-2 rounded-xl border border-[var(--line)] p-3'} data-voice-transfer={message.voiceTransfer.kind}>
                    {['scamQuiz', 'sendReady', 'receipt', 'transferError', 'expired'].includes(message.voiceTransfer.kind) && (
                      <ChatTransferMessage
                        message={message}
                        scamAnswers={chatScam[index] || [null, null, null]}
                        cancelled={!!cancelled[index]}
                        practice={Boolean(message.voiceTransfer.practice) || practiceOn()}
                        onScamAnswer={(slot, value) => setChatScam((prev) => {
                          const current = [...(prev[index] || [null, null, null])]
                          current[slot] = value
                          return { ...prev, [index]: current as Array<'yes' | 'no' | null> }
                        })}
                        onCancel={() => setCancelled((prev) => ({ ...prev, [index]: true }))}
                        onUpdateCard={(card) => updateVoiceCard(index, card)}
                        onDone={(content, card) => {
                          updateVoiceCard(index, card)
                          app.setMessages((prev) => prev.map((item, i) => (i === index ? { ...item, content } : item)))
                          speakReply(content)
                        }}
                        onOpenSettings={openVoiceLimitSettings}
                      />
                    )}
                    {(message.voiceTransfer.kind === 'overLimit' || message.voiceTransfer.kind === 'disabled') && (
                      <>
                        <button type="button" className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={openVoiceLimitSettings}>{t('ai.voiceOpenSettings')}</button>
                        <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => openVoiceFlow(message.voiceTransfer?.flow || 'paynow', message.voiceTransfer?.fields)}>{t('ai.voiceOpenTransfer')}</button>
                      </>
                    )}
                    {message.voiceTransfer.kind === 'suggestPayee' && (
                      <>
                        <button type="button" className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={() => pickVoicePayee(message.voiceTransfer!.payeeId || '', message.voiceTransfer!.amount)}>{t('yes')}</button>
                        <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => setCancelled((prev) => ({ ...prev, [index]: true }))}>{t('no')}</button>
                      </>
                    )}
                    {(message.voiceTransfer.kind === 'choosePayee' || message.voiceTransfer.kind === 'noMatchPayees') && (
                      <>
                        {(message.voiceTransfer.payeeIds || []).map((payeeId) => {
                          const payee = app.payees.find((item) => item.id === payeeId)
                          if (!payee) return null
                          return (
                            <button key={payeeId} type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold text-left" onClick={() => pickVoicePayee(payeeId, message.voiceTransfer?.amount || 0)}>
                              {payee.name}
                            </button>
                          )
                        })}
                        {message.voiceTransfer.stuck && (
                          <button type="button" className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={() => openVoiceFlow('paynow')}>{t('ai.voiceOpenTransfer')}</button>
                        )}
                      </>
                    )}
                    {message.voiceTransfer.kind === 'uncaught' && (
                      <>
                        <button type="button" className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={toggleMic}>{t('ai.voiceTryAgain')}</button>
                        <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => box.current?.focus()}>{t('ai.voiceTypeInstead')}</button>
                        {message.voiceTransfer.stuck && (
                          <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => openVoiceFlow('paynow')}>{t('ai.voiceOpenTransfer')}</button>
                        )}
                      </>
                    )}
                    {message.voiceTransfer.kind === 'unknownPayee' && (
                      <button type="button" className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={() => openVoiceFlow('paynow')}>{t('ai.voiceOpenTransfer')}</button>
                    )}
                    {message.voiceTransfer.stuck && !['uncaught', 'choosePayee', 'noMatchPayees'].includes(message.voiceTransfer.kind) && (
                      <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => openVoiceFlow('paynow')}>{t('ai.voiceOpenTransfer')}</button>
                    )}
                  </div>
                )}
                {message.flags?.fraud && message.scamRisk !== 'high' && (
                  <a className="phone-number mt-3 block font-semibold text-[var(--link)]" href="tel:1799">{t('scamCheck.helpline')}</a>
                )}
                {message.role === 'assistant' && (message.handover || message.flags?.escalated) && message.scamRisk !== 'high' && !paused[index] && (
                  <div className="mt-3 space-y-2">
                    <label className="block text-sm" htmlFor={`summary-${index}`}>
                      {t('ai.summaryHint')}
                      <input id={`summary-${index}`} className="ocbc-field mt-1" value={summary} onChange={(event) => setSummaries((prev) => ({ ...prev, [index]: event.target.value }))} />
                    </label>
                    <button type="button" className="min-h-11 rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={() => { app.setStaffSeed(summary); app.setHelpView('staff') }}>{t('ai.handoverLabel')}</button>
                  </div>
                )}
                {message.role === 'assistant' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FOLLOW.filter((key) => !(key === 'ai.chipStaff' && (message.handover || message.flags?.escalated || message.scamRisk === 'high' || message.flags?.fraud))).map((key) => ({ label: t(key), ask: key === 'ai.chipStaff' || key === 'ai.chipTours' ? '' : t(key), staff: key === 'ai.chipStaff', tours: key === 'ai.chipTours' })).filter((chip, index, list) => list.findIndex((item) => item.label === chip.label) === index).map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        className="min-h-11 rounded-full border border-[var(--line)] px-3 text-left text-sm"
                        onClick={() => {
                          if ('tours' in chip && chip.tours) {
                            app.setHelpOpen(false)
                            navigate('/tours')
                            return
                          }
                          if ('staff' in chip && chip.staff) {
                            app.setStaffSeed(summary)
                            app.setHelpView('staff')
                            return
                          }
                          if (chip.ask) void ask(chip.ask)
                        }}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          )
        })}
        {busy && (
          <article className="card flex max-w-[92%] items-center gap-2 p-3">
            <OllieAvatar />
            <div>
              <span className="flex items-center gap-1" aria-hidden>
                <span className="typing-dot" />
                <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
                <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
              </span>
              <p className="text-sm">{slow ? t('ai.slow') : t('ai.typing')}</p>
              {slow && (
                <button type="button" className="mt-2 min-h-11 rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => void ask(app.lastQuestion, true)}>
                  {t('ai.retry')}
                </button>
              )}
            </div>
          </article>
        )}
      </div>
      {app.messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {app.payees[0] && (
            <button
              type="button"
              className="min-h-11 rounded-full border border-[var(--line)] px-3 text-left text-sm"
              disabled={busy}
              onClick={() => void ask(`Transfer $20 to ${app.payees[0].name}`)}
            >
              {t('ai.voiceChip', { name: app.payees[0].name })}
            </button>
          )}
          {chipsFor(app.screen).map((key) => (
            <button key={key} type="button" className="min-h-11 rounded-full border border-[var(--line)] px-3 text-left text-sm" disabled={busy} onClick={() => {
              if (key !== 'ai.chipHow') { void ask(t(key)); return }
              const id = journeyFor(app.screen)
              app.setHelpOpen(false)
              queueShowHow(id, true)
              navigate(journeyRoute(id))
            }}>
              {t(key)}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex min-h-12 w-full items-center gap-1 rounded-full bg-[var(--card)] px-1 shadow-[inset_0_0_0_1px_var(--line)] focus-within:shadow-[0_0_0_2px_var(--accent)]"
        onSubmit={(e) => { e.preventDefault(); void ask(draft) }}
      >
        {micOk ? (
          <button type="button" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${listening ? 'bg-[var(--accent)] text-white' : ''}`} onClick={toggleMic} aria-pressed={listening} aria-label={listening ? t('speech.stopListening') : t('speech.voiceInput')} disabled={busy}>
            <Mic aria-hidden size={20} />
          </button>
        ) : null}
        <label className="sr-only" htmlFor="ai-draft">{t('ai.placeholder')}</label>
        <textarea
          id="ai-draft"
          ref={box}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(e.target.scrollHeight, 96)}px`
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void ask(draft)
            }
          }}
          placeholder={t('ai.placeholder')}
          rows={1}
          className="max-h-24 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2 text-[15px] leading-normal text-[var(--text)] outline-none"
        />
        <button type="submit" disabled={!draft.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-sm disabled:bg-zinc-300 disabled:text-zinc-600" aria-label={t('ai.send')}>
          <Send aria-hidden size={20} strokeWidth={2.4} />
        </button>
      </form>
      {!micOk && <p className="text-sm text-[var(--muted)]">{t('ai.micMissing')}</p>}
      {listening && (
        <div className="flex items-center justify-between gap-2" role="status">
          <p>{draft ? draft : t('speech.listening')}</p>
          <button type="button" className="min-h-11 rounded-full border border-[var(--line)] px-3 font-semibold" onClick={toggleMic}>
            {t('speech.stopListening')}
          </button>
        </div>
      )}
      {about && (
        <div role="dialog" aria-modal="true" aria-labelledby="about-ai" className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3">
          <h3 id="about-ai" className="mb-2 text-lg font-semibold">{t('ai.about')}</h3>
          <Speakable text={`${t('ai.aboutCan')} ${t('ai.aboutCant')} ${t('ai.aboutAi')}`} auto={app.prefs.readAloud} />
          <button type="button" className="tap mt-3 rounded-xl border border-[var(--line)] px-3" onClick={() => { stopSpeaking(); setAbout(false) }}>
            {t('close')}
          </button>
        </div>
      )}
    </div>
  )
}

const S2T: Record<string, string> = {
  转: '轉', 账: '賬', 帐: '帳', 与: '與', 银: '銀', 钱: '錢', 汇: '匯', 锁: '鎖', 这: '這', 个: '個', 为: '為', 说: '說', 请: '請', 后: '後', 发: '發', 对: '對', 开: '開', 关: '關', 还: '還', 会: '會', 国: '國', 东: '東', 车: '車', 电: '電', 话: '話', 号: '號', 码: '碼', 认: '認', 证: '證', 额: '額', 余: '餘', 币: '幣', 总: '總', 结: '結', 户: '戶', 应: '應', 该: '該', 从: '從', 选: '選', 择: '擇', 显: '顯', 帮: '幫', 问: '問', 题: '題', 时: '時', 间: '間', 现: '現', 无: '無', 见: '見', 长: '長', 门: '門', 里: '裡',
}

function toTraditional(text: string) {
  return text.replace(/[\u4e00-\u9fff]/g, (char) => S2T[char] || char)
}
