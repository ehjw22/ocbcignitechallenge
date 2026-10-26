import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Info, Mic, Send, Square } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { languageById } from '@/lib/languages'
import { journeyRoute, queueShowHow } from '@/lib/showHow'
import { Speakable } from './Speakable'

const CHIP_KEYS = ['ai.chipBalance', 'ai.chipPaynow', 'ai.chipGiro', 'ai.chipGuide', 'ai.chipScam']

function chipsFor(screen: string) {
  if (screen.includes('overseas')) return ['ai.chipOverseas', 'ai.chipGuide', 'ai.chipScam']
  if (screen.includes('giro')) return ['ai.chipGiro', 'ai.chipGuide', 'ai.chipBalance']
  if (screen.includes('limit')) return ['ai.chipLimit', 'ai.chipGuide', 'ai.chipBalance']
  if (screen.includes('paynow') || screen.includes('scan')) return ['ai.chipPaynow', 'ai.chipGuide', 'ai.chipScam']
  return CHIP_KEYS
}

export function AiPanel() {
  const app = useApp()
  const navigate = useNavigate()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [about, setAbout] = useState(false)
  const [listening, setListening] = useState(false)
  const [live, setLive] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [app.messages, busy])

  const ask = async (question: string) => {
    const text = question.trim()
    if (!text || busy) return
    const history = [...app.messages, { role: 'user' as const, content: text }]
    app.setMessages(history)
    app.setLastQuestion(text)
    app.log('ai_question', { question: text, screen: app.screen })
    setDraft('')
    setBusy(true)
    try {
      const lang = languageById(app.prefs.language)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          language: app.prefs.language,
          languageName: lang.english,
          detail: app.prefs.detail,
          screen: app.screen,
          step: app.guideStep || app.step,
        }),
      })
      if (!res.ok) throw new Error('chat')
      const data = (await res.json()) as {
        reply?: string
        source?: 'llm' | 'demo'
        flags?: { refused?: boolean; escalated?: boolean; fraud?: boolean }
        journeyId?: string | null
      }
      const reply = data.reply || t('ai.faq.general.short')
      const flags = data.flags || {}
      if (flags.refused) app.log('ai_refused', { question: text, screen: app.screen })
      if (flags.escalated || flags.fraud) app.log('ai_escalated', { question: text, reason: flags.fraud ? 'fraud' : 'staff', screen: app.screen })
      app.setMessages((prev) => [...prev, { role: 'assistant', content: reply, flags, source: data.source, journeyId: data.journeyId }])
      setLive(reply)
    } catch {
      app.setMessages((prev) => [...prev, { role: 'assistant', content: `${t('ai.busy')}\n\n${t('ai.faq.general.short')}`, source: 'demo' }])
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!app.aiSeed) return
    const q = app.aiSeed
    app.setAiSeed('')
    void ask(q)
    // Seed is consumed once when Help opens the assistant with a question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.aiSeed])

  const toggleMic = () => {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) {
      app.setNotice(t('speech.micDenied'))
      return
    }
    if (listening) {
      recRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new Ctor()
    rec.lang = languageById(app.prefs.language).bcp47
    rec.interimResults = false
    rec.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript ?? ''
      if (said) void ask(said)
    }
    rec.onerror = () => app.setNotice(t('speech.micDenied'))
    rec.onend = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{t('ai.title')}</h2>
        <button type="button" className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--line)]" aria-label={t('ai.about')} onClick={() => setAbout(true)}>
          <Info aria-hidden size={20} />
        </button>
      </div>
      <div className="sr-only" aria-live="polite">{live}</div>
      <div ref={scroller} className="flex min-h-40 w-full flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden">
        {app.messages.length === 0 && <p className="text-[var(--muted)]">{t('ai.empty')}</p>}
        {app.messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={message.role === 'user' ? 'ml-auto max-w-[85%] rounded-2xl bg-[var(--soft)] p-3' : 'card max-w-[85%] p-3'}>
            <p className="mb-1 text-sm font-semibold">{message.role === 'user' ? t('you') : t('ai.title')}</p>
            {message.role === 'assistant' ? (
              <Speakable text={message.content} auto={app.prefs.readAloud} />
            ) : (
              <p>{message.content}</p>
            )}
            {message.flags?.fraud && (
              <div className="status-danger mt-3 rounded-xl bg-[var(--soft)] p-3">
                <p className="font-semibold">{t('staff.hotline')}</p>
                <button
                  type="button"
                  className="tap mt-2 rounded-xl bg-[var(--accent)] px-3 text-[var(--on-accent)]"
                  onClick={() => {
                    app.setHelpOpen(false)
                    window.location.assign('/flow/card-lock')
                  }}
                >
                  {t('staff.lockNow')}
                </button>
              </div>
            )}
            {message.journeyId && (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  className="min-h-12 rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]"
                  onClick={() => {
                    app.setHelpOpen(false)
                    queueShowHow(message.journeyId || '', false)
                    navigate(journeyRoute(message.journeyId || ''))
                  }}
                >
                  {t('tryIt')}
                </button>
                <button
                  type="button"
                  className="min-h-12 rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 font-semibold"
                  onClick={() => {
                    app.setHelpOpen(false)
                    queueShowHow(message.journeyId || '', true)
                    const route = journeyRoute(message.journeyId || '')
                    navigate(route.startsWith('/flow') ? `${route}?practice=1` : route)
                  }}
                >
                  {t('practiseSample')}
                </button>
              </div>
            )}
            {message.flags?.escalated && (
              <button type="button" className="tap mt-2 underline" onClick={() => app.setHelpView('staff')}>
                {t('help.staff')}
              </button>
            )}
          </article>
        ))}
        {busy && <p>{t('loading') === 'loading' ? '…' : '…'}</p>}
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">{t('ai.suggestions')}</p>
        <div className="flex flex-wrap gap-2">
          {chipsFor(app.screen).map((key) => (
            <button key={key} type="button" className="tap rounded-full border border-[var(--line)] px-3 text-left" onClick={() => void ask(t(key))}>
              {t(key)}
            </button>
          ))}
        </div>
      </div>
      <form
        className="flex w-full flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void ask(draft)
        }}
      >
        <label className="sr-only" htmlFor="ai-draft">{t('ai.placeholder')}</label>
        <textarea
          id="ai-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void ask(draft)
            }
          }}
          placeholder={t('ai.placeholder')}
          rows={3}
          className="min-h-24 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 text-[1rem] leading-normal text-[var(--text)]"
        />
        <div className="flex gap-2">
          <button type="button" className="tap rounded-xl border border-[var(--line)] px-3" onClick={toggleMic} aria-pressed={listening} aria-label={t('speech.voiceInput')}>
            {listening ? <Square aria-hidden size={18} /> : <Mic aria-hidden size={18} />}
          </button>
          <button type="submit" className="tap flex-1 rounded-xl bg-[var(--accent)] px-3 text-[var(--on-accent)]" aria-label={t('ai.send')}>
            <Send aria-hidden size={18} />
          </button>
        </div>
      </form>
      {listening && <p role="status">{t('speech.listening')}</p>}
      {about && (
        <div role="dialog" aria-modal="true" aria-labelledby="about-ai" className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-3">
          <h3 id="about-ai" className="mb-2 text-lg font-semibold">{t('ai.about')}</h3>
          <Speakable text={t('ai.aboutBody')} auto={app.prefs.readAloud} />
          <button type="button" className="tap mt-3 rounded-xl border border-[var(--line)] px-3" onClick={() => setAbout(false)}>
            {t('close')}
          </button>
        </div>
      )}
    </div>
  )
}
