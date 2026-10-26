import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { staffSummary } from '@/lib/staffSummary'
import { Check, TriangleAlert } from 'lucide-react'
import { Choice, choiceClass } from './Choice'
import { Speakable } from './Speakable'

const TOPICS = ['transfer', 'card', 'account', 'login', 'other'] as const

export function StaffPanel() {
  const app = useApp()
  const navigate = useNavigate()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [topic, setTopic] = useState<(typeof TOPICS)[number]>('transfer')
  const [method, setMethod] = useState<'message' | 'phone' | 'email'>('message')
  const [time, setTime] = useState('anytime')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [attached, setAttached] = useState(true)
  const context = app.staffSeed || [app.screen, app.step].filter(Boolean).join(', ')

  const submit = () => {
    if (!message.trim()) {
      setError(t('errors.required', { field: t('staff.summary') }))
      return
    }
    if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      setError(t('errors.email'))
      return
    }
    if (method === 'phone' && contact.replace(/\D/g, '').length < 8) {
      setError(t('errors.phone'))
      return
    }
    const summary = `${t(`staff.topic.${topic}`)}: ${message.trim()}${attached && context ? ` (${context})` : ''}`
    const request = app.addRequest({
      summary,
      summaryEn: staffSummary('en', { guideId: '', stepId: app.step, screen: app.screen, question: app.lastQuestion, seed: app.staffSeed }),
      task: topic,
      step: app.step || '',
      language: app.prefs.language,
      method,
      time: method === 'phone' ? time : '',
      contact,
      urgent: false,
    })
    app.log('staff_request', { ref: request.ref, task: request.task })
    setDone(request.ref)
    if (app.prefs.readAloud) app.setAnnounce(t('staff.thanks'))
  }

  if (done) {
    return (
      <div className="space-y-2">
        <h2 className="text-base font-semibold">{t('staff.thanks')}</h2>
        <Speakable text={t('staff.thanks')} auto={app.prefs.readAloud} hideText />
        <p className="font-semibold">{t('staff.ref')}: {done}</p>
      </div>
    )
  }

  return (
    <form className="flex min-h-0 flex-col gap-2" onSubmit={(event) => { event.preventDefault(); submit() }}>
      <button type="button" className="text-left text-sm font-semibold text-[var(--accent)]" onClick={() => { app.setHelpOpen(false); navigate('/flow/card-lock') }}>
        {t('staff.lostLink')}
      </button>
      <div role="radiogroup" aria-label={t('staff.topicLabel')} className="flex gap-1 overflow-x-auto">
        {TOPICS.map((item) => (
          <button key={item} type="button" role="radio" aria-checked={topic === item} className={`${choiceClass(topic === item)} inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-3 text-sm`} onClick={() => setTopic(item)}>
            {t(`staff.topic.${item}`)}
            <Check aria-hidden size={14} className={topic === item ? 'text-[var(--accent)] opacity-100' : 'opacity-0'} />
          </button>
        ))}
      </div>
      <label className="block text-sm font-semibold" htmlFor="staff-message">
        {t('staff.summary')}
        <textarea id="staff-message" value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder={t('staff.placeholder')} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] p-2 font-normal" />
      </label>
      {attached && context && (
        <button type="button" className="self-start rounded-full border border-[var(--line)] px-2 py-1 text-xs" onClick={() => setAttached(false)}>
          {t('staff.attached', { what: context })} ×
        </button>
      )}
      <div role="radiogroup" aria-label={t('staff.method')} className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'grid grid-cols-3 gap-1'}>
        {(['message', 'phone', 'email'] as const).map((item) => (
          <Choice key={item} selected={method === item} onClick={() => setMethod(item)}>
            {t(item === 'message' ? 'staff.inApp' : `staff.${item}`)}
          </Choice>
        ))}
      </div>
      {method === 'phone' && (
        <label className="block text-sm font-semibold" htmlFor="staff-time">
          {t('staff.time')}
          <select id="staff-time" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 font-normal">
            {['morning', 'afternoon', 'evening', 'anytime'].map((item) => (
              <option key={item} value={item}>{t(`staff.${item}`)}</option>
            ))}
          </select>
        </label>
      )}
      {method !== 'message' && (
        <label className="block text-sm font-semibold" htmlFor="staff-contact">
          {t('staff.contact')}
          <input id="staff-contact" value={contact} onChange={(event) => setContact(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-2 font-normal" autoComplete="off" />
        </label>
      )}
      <div className="min-h-[4.5rem]">
        {error && (
          <p role="alert" className="field-error">
            <TriangleAlert aria-hidden size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
      <button type="submit" className="min-h-11 rounded-xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]">{t('staff.send')}</button>
    </form>
  )
}
