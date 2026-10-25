import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CircleAlert, TriangleAlert } from 'lucide-react'
import { Page } from '@/components/Shell'
import { Speakable } from '@/components/Speakable'
import { useApp } from '@/context/AppContext'
import { FX, PAYNOW_DIRECTORY, payeeName } from '@/data/bank'
import { flowById, type FlowField } from '@/data/flows'
import { translate } from '@/i18n'
import { formatSGD } from '@/lib/format'
import { startGuide } from '@/lib/guide'
import { speak } from '@/lib/speech'
import { validateForm, type Issue } from '@/lib/validate'

export function FlowPage() {
  const { flowId = '' } = useParams()
  const flow = flowById(flowId)
  const app = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const practice = params.get('practice') === '1'
  const demo = params.get('demo')
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [form, setForm] = useState<Record<string, string>>({})
  const [issues, setIssues] = useState<Issue[]>([])
  const [stage, setStage] = useState<'form' | 'review' | 'otp' | 'done'>('form')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [unusual, setUnusual] = useState(false)
  const [ref, setRef] = useState('')
  const alertRef = useRef<HTMLDivElement>(null)
  const guided = useRef(false)

  useEffect(() => {
    if (!flow) return
    app.setScreen(flow.id)
    const next: Record<string, string> = {}
    flow.fields.forEach((field) => {
      next[field.id] = practice ? field.sample : field.type === 'account' || field.type === 'select' || field.type === 'toggle' ? field.sample : ''
    })
    if (demo === 'mei' && flow.id === 'overseas') {
      next.name = 'Tan Wei Ming'
      next.country = 'Australia'
      next.swift = 'CTBAAU2S'
      next.account = '123456789'
      next.amount = '5000'
      next.from = '360'
    }
    setForm(next)
    setStage('form')
    if (demo === 'mei' && flow.id === 'overseas') {
      const found = validateForm(flow.id, next, app.balances['360'] ?? 0)
      setIssues(found)
      if (found[0]) {
        app.setAnnounce(translate(app.prefs.language, `errors.${found[0].code}`, found[0].params))
        app.setStep('account')
      }
    } else setIssues([])
    // Reset the form when the journey or practice flag changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId, practice, demo])

  useEffect(() => {
    if (!flow || params.get('tour') !== '1' || guided.current) return
    guided.current = true
    const timer = window.setTimeout(() => {
      const result = startGuide({
        guideId: flow.guideId,
        text: t,
        readAloud: app.prefs.readAloud,
        speak: (text, onRange) => void speak(text, { language: app.prefs.language, rate: app.prefs.speechRate, dialect: app.prefs.dialect, onRange }),
        onMissing: (element, stepId) => {
          app.log('guide_step_missing', { guideId: flow.guideId, element, stepId })
          app.setNotice(t('guideSkipped'))
        },
        onStart: (guideId) => app.log('guide_started', { guideId }),
        onStep: (stepId) => app.setGuideStep(`${flow.guideId}:${stepId}`),
        onDrop: (guideId, stepId) => app.log('guide_dropped', { guideId, stepId }),
        onDone: (guideId) => app.log('guide_completed', { guideId }),
      })
      if (!result.started) app.setNotice(t('guideEmpty'))
    }, 400)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId])

  const groups = useMemo(() => {
    if (!flow) return []
    const list: { guide: string; fields: FlowField[] }[] = []
    flow.fields.forEach((field) => {
      const last = list[list.length - 1]
      if (last && last.guide === field.guide) last.fields.push(field)
      else list.push({ guide: field.guide, fields: [field] })
    })
    return list
  }, [flow])

  if (!flow) {
    return (
      <Page title={t('pay.title')} back>
        <p className="p-4">{t('guideEmpty')}</p>
      </Page>
    )
  }

  const title = flow.id === 'card-lock' ? t('flows.cardLock') : flow.id === 'card-lost' ? t('flows.cardLost') : flow.id === 'limit' ? t('flows.limit') : t(flow.title)
  const balance = app.balances[form.from || '360'] ?? 0
  const payee = flow.payeeField ? form[flow.payeeField] : ''
  const lookedUp = PAYNOW_DIRECTORY[(form.to || '').replace(/\s/g, '')]
  const displayPayee = lookedUp || payeeName(payee)
  const fx = flow.id === 'overseas' ? FX[form.country] || FX.Australia : null
  const sendAmount = Number(String(form.amount || '').replace(/,/g, '')) || 0
  const received = fx ? Math.max(0, sendAmount - fx.fee) * fx.perSgd : 0

  const describe = (issue: Issue) => {
    const field = flow.fields.find((item) => item.id === issue.field)
    const params: Record<string, string | number> = { ...(issue.params || {}) }
    if (field && params.field) params.field = t(field.label)
    if (issue.code === 'insufficient') params.available = formatSGD(Number(issue.params?.available ?? balance))
    return t(`errors.${issue.code}`, params)
  }

  const submit = () => {
    const found = validateForm(flow.id, form, balance)
    setIssues(found)
    found.forEach((issue) => app.log('error_shown', { code: issue.code, flowId: flow.id }))
    if (found.length) {
      app.setAnnounce(describe(found[0]))
      alertRef.current?.focus()
      return
    }
    const amount = Number(String(form[flow.amountField || ''] || '').replace(/,/g, ''))
    const high = flow.amountField && (amount >= 3000 || amount > app.profile.usualTransfer * 3)
    if (high) {
      setUnusual(true)
      return
    }
    setIssues([])
    setStage('review')
  }

  const lockCard = (id: string, locked: boolean) => {
    app.setCards(app.cards.map((card) => (card.id === id ? { ...card, locked } : card)))
  }

  const confirm = () => {
    const reference = `DEMO-${Math.floor(100000 + Math.random() * 900000)}`
    setRef(reference)
    if (!practice) {
      const amount = Number(String(form[flow.amountField || ''] || '').replace(/,/g, ''))
      if (flow.kind === 'payment' && amount > 0) {
        const from = form.from || '360'
        app.setBalance(from, (app.balances[from] ?? 0) - amount)
        app.addTxn({ id: reference, title: displayPayee || title, amount: -amount, date: new Date().toISOString().slice(0, 10), accountId: from })
      }
      if (flow.id === 'card-lock') lockCard(form.card || 'credit', form.lock !== 'no')
      if (flow.id === 'card-lost') lockCard(form.card || 'credit', true)
      if (flow.id === 'goal') {
        app.setGoals([...app.goals, { id: reference, name: form.name || 'Goal', target: Number(form.target) || 0, monthly: Number(form.monthly) || 0 }])
      }
    } else if (flow.id === 'card-lock') {
      lockCard(form.card || 'credit', form.lock !== 'no')
    }
    setStage('done')
    app.setAnnounce(practice ? t('practice.done') : t('success.demo'))
  }

  return (
    <Page title={title} back>
      <div className="space-y-3 p-4">
        {practice && (
          <p className="rounded-lg border-l-4 border-[var(--accent)] bg-[var(--card)] px-3 py-2 text-[0.85rem] font-semibold leading-normal" role="status">
            <Speakable text={t('practice.banner')} auto={app.prefs.readAloud} />
          </p>
        )}
        {demo === 'mei' && <p className="card p-3">{t('demo.mei')}</p>}
        {demo === 'arif' && (
          <div className="card space-y-2 p-3">
            <p>{t('demo.arif')}</p>
            <button type="button" className="tap rounded-xl border border-[var(--line)] px-3" onClick={() => { app.setAiSeed(t('ai.chipGiro')); app.openHelp('ai') }}>{t('flows.whatGiro')}</button>
            <Link to="/insights" className="tap inline-flex items-center font-semibold underline">{t('demo.seeInsights')}</Link>
          </div>
        )}
        {flow.id === 'limit' && (
          <p data-guide="limit-current" className="card p-3 font-semibold">{t('flows.currentLimit', { amount: formatSGD(app.limit) })}</p>
        )}
        {flow.id === 'scan' && stage === 'form' && (
          <div data-guide="scan-frame" className="card flex flex-col items-center gap-3 p-4">
            <div aria-hidden className="grid h-28 w-28 grid-cols-5 gap-1 bg-white p-2">
              {Array.from({ length: 25 }, (_, i) => (
                <span key={i} className={i % 3 === 0 ? 'bg-black' : 'bg-transparent'} />
              ))}
            </div>
            <p>{t('flows.scanHint')}</p>
            <button type="button" className="tap rounded-xl bg-[var(--accent)] px-3 text-[var(--on-accent)]" onClick={() => setForm((prev) => ({ ...prev, merchant: 'Hawker Stall 12' }))}>
              {t('flows.scanButton')}
            </button>
          </div>
        )}
        {stage === 'form' && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            {fx && (
              <section className="card space-y-1 p-3" aria-label={t('fx.sample')}>
                <p className="font-semibold">{t('fx.sample')}</p>
                <p>{t('fx.currency')}: {t(fx.currencyKey)}</p>
                <p>{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</p>
                <p>{t('fx.fee', { fee: formatSGD(fx.fee) })}</p>
                <p>{t('fx.received', { amount: `${t(fx.currencyKey)} ${received.toFixed(2)}` })}</p>
                <p className="text-[var(--muted)]">{t('fx.accountHint', { hint: t(`fx.hint.${fx.account}`) })}</p>
              </section>
            )}
            {groups.filter((group) => group.fields.some((field) => field.id !== 'lock')).map((group) => (
              <fieldset key={group.guide} data-guide={flow.id === 'scan' && group.guide === 'scan-frame' ? undefined : group.guide} className="card space-y-3 p-3">
                {group.fields.map((field) => {
                  if (field.id === 'laterDate' && form.when !== 'later') return null
                  if (field.id === 'swift' && fx?.account === 'iban') return null
                  const iban = field.id === 'account' && fx?.account === 'iban'
                  return (
                  <Field
                    key={field.id}
                    field={field}
                    value={form[field.id] ?? ''}
                    label={iban ? t('flows.iban') : undefined}
                    hint={iban ? t('flows.ibanHint') : undefined}
                    placeholder={iban ? 'GB29 NWBK 6016 1331 9268 19' : undefined}
                    onChange={(value) => {
                      setForm((prev) => ({ ...prev, [field.id]: value }))
                      app.setScreen(flow.id, field.id)
                    }}
                    t={t}
                  />
                  )
                })}
                {(flow.id === 'paynow' || flow.id === 'topup') && group.fields.some((field) => field.id === 'to') && (
                  <p className="flex items-start gap-2 text-sm leading-normal">
                    <TriangleAlert aria-hidden className="mt-0.5 shrink-0" size={18} />
                    {lookedUp ? t('flows.nameCheck', { name: lookedUp }) : form.to ? t('flows.nameUnknown') : t('flows.nameSample', { name: PAYNOW_DIRECTORY['91234567'] })}
                  </p>
                )}
              </fieldset>
            ))}
            {flow.id === 'card-lock' && (
              <label data-guide="card-toggle" className="card flex min-h-tap items-center justify-between px-3">
                <span className="font-semibold">{t('flows.lockCard')}</span>
                <input
                  type="checkbox"
                  role="switch"
                  checked={form.lock !== 'no'}
                  aria-checked={form.lock !== 'no'}
                  onChange={(e) => setForm((prev) => ({ ...prev, lock: e.target.checked ? 'yes' : 'no' }))}
                />
              </label>
            )}
            {issues.length > 0 && (
              <div ref={alertRef} tabIndex={-1} role="alert" className="status-danger card space-y-2 p-3">
                <p className="flex items-center gap-2 font-semibold text-[var(--danger)]">
                  <CircleAlert aria-hidden /> {t('errors.summary')}
                </p>
                <ul className="space-y-2">
                  {issues.map((issue) => (
                    <li key={`${issue.field}-${issue.code}`}>
                      <Speakable text={describe(issue)} auto={app.prefs.readAloud} />
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button type="button" className="tap flex-1 rounded-xl border border-[var(--line)]" onClick={() => { app.setAiSeed(describe(issues[0])); app.openHelp('ai') }}>{t('askAi')}</button>
                  <button type="button" className="tap flex-1 rounded-xl border border-[var(--line)]" onClick={() => app.openHelp('staff')}>{t('getHelp')}</button>
                </div>
              </div>
            )}
            <button type="submit" data-guide={reviewGuide(flow.id)} className="ocbc-btn">
              {t('flows.submit')}
            </button>
            {!practice && (
              <button type="button" className="tap w-full rounded-xl border border-[var(--line)] bg-[var(--card)]" onClick={() => navigate(`/flow/${flow.id}?practice=1&tour=1`)}>
                {t('practise')}
              </button>
            )}
            {demo === 'mei' && (
              <button type="button" className="tap w-full rounded-xl border border-[var(--line)] bg-[var(--card)]" onClick={() => { app.setStaffSeed(t('demo.mei')); app.openHelp('staff') }}>
                {t('demo.contactStaff')}
              </button>
            )}
          </form>
        )}
        {stage === 'review' && (
          <section className="card space-y-2 p-4">
            <h2 className="text-lg font-semibold">{t('review')}</h2>
            {flow.fields.filter((field) => {
              if (field.id === 'laterDate') return form.when === 'later'
              if (field.id === 'when') return form.when !== 'later'
              if (field.id === 'swift') return fx?.account !== 'iban'
              return true
            }).map((field) => (
              <p key={field.id} className="flex justify-between gap-3">
                <span className="text-[var(--muted)]">{field.id === 'account' && fx?.account === 'iban' ? t('flows.iban') : t(field.label)}</span>
                <span className="text-right font-semibold">{display(field, form[field.id] || '', t)}</span>
              </p>
            ))}
            {flow.id === 'card-lost' && <p>{t('flows.lostNote')}</p>}
            <button type="button" className="ocbc-btn" onClick={() => { if (flow.kind === 'payment') { setOtp(''); setOtpError(''); setStage('otp') } else confirm() }}>{flow.kind === 'payment' ? t('continue') : t('confirm')}</button>
            <button type="button" className="tap w-full" onClick={() => setStage('form')}>{t('back')}</button>
          </section>
        )}
        {stage === 'otp' && (
          <section className="card space-y-3 p-4">
            <h2 className="text-lg font-semibold" id="otp-title">{t('flows.otpTitle')}</h2>
            <p className="text-sm text-[var(--muted)]">{t('flows.otpBody')}</p>
            <input id="demo-otp" aria-labelledby="otp-title" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => setOtp(e.target.value)} className="ocbc-field" />
            {otpError && <p role="alert" className="text-[var(--danger)]">{otpError}</p>}
            <button
              type="button"
              className="ocbc-btn"
              onClick={() => {
                if (!/^\d{6}$/.test(otp.trim())) {
                  setOtpError(t('errors.otp'))
                  return
                }
                setOtpError('')
                confirm()
              }}
            >
              {t('confirm')}
            </button>
            <button type="button" className="ocbc-btn-secondary" onClick={() => setStage('review')}>{t('back')}</button>
          </section>
        )}
        {stage === 'done' && (
          <section className="card space-y-3 p-4" role="status">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--success)]">
                <span aria-hidden>✓</span> {practice ? t('practice.doneTitle') : t('success.title')}
              </h2>
              <Speakable text={practice ? t('practice.done') : t('success.summarySpoken', { amount: formatSGD(sendAmount), name: displayPayee || title, ref })} auto={app.prefs.readAloud} hideText />
            </div>
            <dl className="space-y-2">
              <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">{t('amount')}</dt><dd className="font-semibold">{formatSGD(sendAmount)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">{t('success.payee')}</dt><dd className="text-right font-semibold">{displayPayee || title}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">{t('success.reference')}</dt><dd className="font-semibold">{ref}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">{t('success.when')}</dt><dd className="font-semibold">{form.when === 'later' && form.laterDate ? form.laterDate : new Date().toISOString().slice(0, 10)}</dd></div>
              {fx && (
                <>
                  <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">{t('success.fee')}</dt><dd className="font-semibold">{formatSGD(fx.fee)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-[var(--muted)]">{t('success.rate')}</dt><dd className="text-right font-semibold">{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</dd></div>
                </>
              )}
            </dl>
            {flow.id === 'card-lost' && (
              <div className="status-danger rounded-xl bg-[var(--soft)] p-3">
                <p className="font-semibold">{t('staff.hotline')}</p>
                <p>{t('staff.hotlineBody')}</p>
              </div>
            )}
            {practice && (
              <button type="button" className="tap w-full rounded-xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]" onClick={() => navigate(`/flow/${flow.id}`)}>
                {t('doForReal')}
              </button>
            )}
            <Link to="/" className="tap flex items-center justify-center rounded-xl border border-[var(--line)]">{t('backHome')}</Link>
          </section>
        )}
      </div>
      {unusual && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 md:items-center" role="dialog" aria-modal="true" aria-labelledby="unusual-title">
          <div className="card w-full max-w-sm space-y-3 p-4">
            <h2 id="unusual-title" className="text-lg font-semibold">{t('unusual.title')}</h2>
            <Speakable
              text={t('unusual.body', { amount: formatSGD(Number(form[flow.amountField || 'amount'] || 0)), name: lookedUp || payee || t('flows.recipient') })}
              auto={app.prefs.readAloud}
            />
            <button type="button" className="tap w-full rounded-xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]" onClick={() => { setUnusual(false); setIssues([]); setStage('review') }}>
              {t('yesContinue')}
            </button>
            <button
              type="button"
              className="tap w-full rounded-xl border border-[var(--line)]"
              onClick={() => {
                setUnusual(false)
                document.getElementById(`field-${flow.amountField}`)?.focus()
              }}
            >
              {t('changeAmount')}
            </button>
          </div>
        </div>
      )}
    </Page>
  )
}

function reviewGuide(flowId: string) {
  const map: Record<string, string> = {
    paynow: 'paynow-review',
    topup: 'paynow-review',
    transfer: 'transfer-review',
    overseas: 'overseas-review',
    bill: 'bill-review',
    giro: 'giro-review',
    scan: 'scan-review',
    goal: 'goal-review',
    'card-lock': 'card-review',
    'card-lost': 'lost-confirm',
    limit: 'limit-review',
  }
  return map[flowId]
}

function display(field: FlowField, value: string, t: (key: string) => string) {
  if (field.type === 'account' || field.type === 'select') {
    const option = field.options?.find((item) => item.value === value)
    return option ? t(option.label) : value
  }
  if (field.id === 'savePayee') return value === 'yes' ? t('yes') : t('no')
  if (field.type === 'toggle') return value === 'no' ? t('flows.unlocked') : t('flows.locked')
  if (field.type === 'amount') return formatSGD(Number(value || 0))
  return value
}

function Field({
  field,
  value,
  onChange,
  t,
  label,
  hint,
  placeholder,
}: {
  field: FlowField
  value: string
  onChange: (value: string) => void
  t: (key: string) => string
  label?: string
  hint?: string
  placeholder?: string
}) {
  if (field.type === 'toggle') {
    if (field.id === 'lock') return null
    return (
      <label className="flex min-h-11 items-center justify-between gap-3 leading-normal">
        <span>{t(field.label)}</span>
        <input type="checkbox" role="switch" checked={value === 'yes'} aria-checked={value === 'yes'} onChange={(e) => onChange(e.target.checked ? 'yes' : 'no')} />
      </label>
    )
  }
  const id = `field-${field.id}`
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-1 block text-[12px] font-medium text-[#6B6B6B]">
        {label || t(field.label)} {field.placeholder === 'optional' && <span className="font-normal text-[var(--muted)]">({t('optional')})</span>}
      </span>
      {hint && <span className="mb-1 block text-[0.85rem] font-normal text-[var(--muted)]">{hint}</span>}
      {field.type === 'select' || field.type === 'account' ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="ocbc-field">
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>{t(option.label)}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          value={value}
          inputMode={field.inputMode}
          autoComplete="off"
          placeholder={placeholder || (field.placeholder ? t(field.placeholder) : undefined)}
          onChange={(e) => onChange(e.target.value)}
          className={`ocbc-field ${field.type === 'amount' ? 'text-center text-[28px] font-semibold' : ''}`}
        />
      )}
    </label>
  )
}
