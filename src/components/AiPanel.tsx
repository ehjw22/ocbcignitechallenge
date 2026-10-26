import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, Mic, Send } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { FX } from '@/data/bank'
import { translate } from '@/i18n'
import { formatSGD } from '@/lib/format'
import { languageById } from '@/lib/languages'
import { journeyRoute, queueShowHow } from '@/lib/showHow'
import { prefetchSpeech, speak, stopSpeaking } from '@/lib/speech'
import type { ChatAction, ChatMessage } from '@/lib/types'
import { RichText, plainSpeech } from './RichText'
import { Speakable } from './Speakable'

const CHIP_KEYS = ['ai.chipBalance', 'ai.chipPaynow', 'ai.chipGiro', 'ai.chipHow', 'ai.chipScam']
const FOLLOW = ['ai.chipHow', 'ai.chipSimpler', 'ai.chipStaff'] as const

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

function visibleReply(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('```')) return trimmed
  const match = trimmed.match(/"reply"\s*:\s*"/)
  if (!match || match.index == null) return ''
  let out = ''
  for (let i = match.index + match[0].length; i < trimmed.length; i += 1) {
    const ch = trimmed[i]
    if (ch === '\\') {
      const next = trimmed[i + 1]
      out += next === 'n' ? '\n' : next || ''
      i += 1
      continue
    }
    if (ch === '"') break
    out += ch
  }
  return out
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
    const amount = Number(action.fields.amount || 0)
    const received = Math.max(0, Math.round((amount - fx.fee) * fx.perSgd))
    return t('ai.confirmOverseas', {
      amount: formatSGD(amount || 500),
      name: action.fields.name || 'Tan Wei Ming',
      country: action.fields.country || 'Australia',
      fee: formatSGD(fx.fee),
      received: `${t(fx.currencyKey)} ${received}`,
    })
  }
  return t('ai.confirmGeneric', { task: action.intent })
}

function OllieAvatar() {
  return (
    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)]">
      O
    </span>
  )
}

export function AiPanel() {
  const app = useApp()
  const navigate = useNavigate()
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
  const scroller = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const micOk = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [app.messages, busy, slow])

  useEffect(() => {
    if (!busy) {
      setSlow(false)
      return
    }
    const timer = window.setTimeout(() => setSlow(true), 15000)
    return () => window.clearTimeout(timer)
  }, [busy])

  const ask = async (question: string, retry = false) => {
    const explain = question.startsWith('__explain__:')
    const text = explain ? t('ai.what') : question.trim()
    if (!text) return
    abortRef.current?.abort()
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
      const reply = data.reply || t('ai.faq.general.short')
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
        scamRisk: data.scamRisk,
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
    const rec = new Ctor()
    rec.lang = speechLang(app.prefs.language, app.prefs.dialect)
    rec.interimResults = true
    rec.onresult = (event) => {
      let said = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i += 1) {
        const bit = event.results[i]?.[0]?.transcript || ''
        if (event.results[i]?.isFinal) said += bit
        else interim += bit
      }
      const shown = (said || interim).trim()
      setDraft(shown)
      setLive(shown)
      if (said.trim()) void ask(said.trim())
    }
    rec.onerror = () => app.setNotice(t('speech.micDenied'))
    rec.onend = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  const fill = (action: ChatAction) => {
    sessionStorage.setItem('ocbc-fill', JSON.stringify({ flow: action.intent, fields: action.fields }))
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
                    <p className="phone-number font-semibold">{t('staff.hotline')}</p>
                    <button type="button" className="min-h-11 rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={() => { setSummaries((prev) => ({ ...prev, [index]: summary })); app.setStaffSeed(summary); app.setHelpView('staff') }}>{t('ai.handoverLabel')}</button>
                  </div>
                )}
                {showCard && message.action && (
                  <div className="mt-3 space-y-2 rounded-xl border border-[var(--line)] p-3">
                    <p>{confirmCopy(message.action, t)}</p>
                    <p className="text-sm text-[var(--muted)]">{t('ai.sampleRate')}</p>
                    <button type="button" className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={() => fill(message.action as ChatAction)}>{t('ai.fillIn')}</button>
                    <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => { app.setHelpOpen(false); queueShowHow(message.action?.intent || message.journeyId || '', false); navigate(journeyRoute(message.action?.intent || '')) }}>{t('ai.chipHow')}</button>
                    <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => setCancelled((prev) => ({ ...prev, [index]: true }))}>{t('ai.cancelTask')}</button>
                  </div>
                )}
                {message.flags?.fraud && message.scamRisk !== 'high' && (
                  <p className="phone-number mt-3 font-semibold">{t('staff.hotline')}</p>
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
                    {(message.suggestions?.length ? message.suggestions.map((item) => ({ label: item, ask: item })) : FOLLOW.map((key) => ({ label: t(key), ask: key === 'ai.chipStaff' ? '' : t(key), staff: key === 'ai.chipStaff', how: key === 'ai.chipHow' }))).map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        className="min-h-11 rounded-full border border-[var(--line)] px-3 text-left text-sm"
                        onClick={() => {
                          if ('staff' in chip && chip.staff) {
                            app.setStaffSeed(summary)
                            app.setHelpView('staff')
                            return
                          }
                          if ('how' in chip && chip.how && (message.journeyId || message.action)) {
                            app.setHelpOpen(false)
                            queueShowHow(message.journeyId || message.action?.intent || '', false)
                            navigate(journeyRoute(message.journeyId || message.action?.intent || ''))
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
          {chipsFor(app.screen).map((key) => (
            <button key={key} type="button" className="min-h-11 rounded-full border border-[var(--line)] px-3 text-left text-sm" disabled={busy} onClick={() => void ask(t(key))}>
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
          <button type="button" className="flex h-10 w-10 shrink-0 items-center justify-center" onClick={toggleMic} aria-pressed={listening} aria-label={t('speech.voiceInput')} disabled={busy}>
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
      {listening && <p role="status">{draft ? draft : t('ai.hearing')}</p>}
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
