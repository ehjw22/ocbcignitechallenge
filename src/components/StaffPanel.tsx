import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { staffSummary } from '@/lib/staffSummary'
import { Speakable } from './Speakable'

export function StaffPanel() {
  const app = useApp()
  const navigate = useNavigate()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [urgent, setUrgent] = useState<'unknown' | 'yes' | 'no'>('unknown')
  const [method, setMethod] = useState<'message' | 'phone' | 'email'>('message')
  const [time, setTime] = useState('anytime')
  const [contact, setContact] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const summaryOpts = () => {
    const [guideId, stepId] = app.guideStep.split(':')
    return { guideId, stepId: stepId || app.step, screen: app.screen, question: app.lastQuestion, seed: app.staffSeed }
  }
  const generated = useMemo(
    () => staffSummary(app.prefs.language, summaryOpts()),
    [app.guideStep, app.screen, app.step, app.lastQuestion, app.staffSeed, app.prefs.language],
  )
  const [summary, setSummary] = useState(generated)

  useEffectSync(generated, setSummary)

  const submit = () => {
    if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      setError(t('errors.email'))
      return
    }
    if (method === 'phone' && contact.replace(/\D/g, '').length < 8) {
      setError(t('errors.phone'))
      return
    }
    const [guideId, stepId] = app.guideStep.split(':')
    const request = app.addRequest({
      summary,
      summaryEn: staffSummary('en', summaryOpts()),
      task: guideId || app.screen,
      step: stepId || app.step || '',
      language: app.prefs.language,
      method,
      time,
      contact,
      urgent: false,
    })
    app.log('staff_request', { ref: request.ref, task: request.task })
    setDone(request.ref)
    app.setAnnounce(t('staff.thanks'))
  }

  if (urgent === 'yes') {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">{t('staff.hotlineTitle')}</h2>
        <Speakable text={`${t('staff.hotlineBody')} ${t('staff.hotline')}`} auto={app.prefs.readAloud} />
        <p className="text-lg font-semibold">{t('staff.hotline')}</p>
        <button type="button" className="tap w-full rounded-xl bg-[var(--accent)] text-[var(--on-accent)]" onClick={() => { app.setHelpOpen(false); navigate('/flow/card-lock') }}>
          {t('staff.lockNow')}
        </button>
        <p>{t('staff.progressSaved')}</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('staff.thanks')}</h2>
        <Speakable text={t('staff.thanks')} auto={app.prefs.readAloud} hideText />
        <p className="text-lg font-semibold">{t('staff.ref')}: {done}</p>
        <p>{t('staff.status')}: {t('staff.received')}</p>
      </div>
    )
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <h2 className="text-xl font-semibold">{t('staff.title')}</h2>
      <p>{t('staff.body')}</p>
      <fieldset>
        <legend className="mb-2 font-semibold">{t('staff.urgentQ')}</legend>
        <div className="flex gap-2">
          <button type="button" className="tap flex-1 rounded-xl border border-[var(--line)]" onClick={() => { setUrgent('yes'); app.log('staff_urgent_hotline', { screen: app.screen }) }}>
            {t('staff.yes')}
          </button>
          <button type="button" className="tap flex-1 rounded-xl border border-[var(--line)]" aria-pressed={urgent === 'no'} onClick={() => setUrgent('no')}>
            {t('staff.no')}
          </button>
        </div>
      </fieldset>
      <label className="block font-semibold" htmlFor="staff-summary">
        {t('staff.summary')}
        <textarea id="staff-summary" value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] p-3 font-normal" />
      </label>
      <fieldset>
        <legend className="mb-2 font-semibold">{t('staff.method')}</legend>
        {(['message', 'phone', 'email'] as const).map((item) => (
          <label key={item} className="mb-2 flex min-h-tap items-center gap-2">
            <input type="radio" name="method" checked={method === item} onChange={() => setMethod(item)} />
            {t(`staff.${item}`)}
          </label>
        ))}
      </fieldset>
      <label className="block font-semibold" htmlFor="staff-time">
        {t('staff.time')}
        <select id="staff-time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full min-h-tap rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 font-normal">
          {['morning', 'afternoon', 'evening', 'anytime'].map((item) => (
            <option key={item} value={item}>{t(`staff.${item}`)}</option>
          ))}
        </select>
      </label>
      {method !== 'message' && (
        <label className="block font-semibold" htmlFor="staff-contact">
          {t('staff.contact')}
          <input id="staff-contact" value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1 w-full min-h-tap rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 font-normal" autoComplete="off" />
        </label>
      )}
      {error && <p role="alert" className="text-[var(--danger)]">{error}</p>}
      <button type="submit" className="tap w-full rounded-xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]">{t('staff.send')}</button>
    </form>
  )
}

function useEffectSync(value: string, set: (v: string) => void) {
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    set(value)
  }
}
