import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronDown, CircleAlert, TriangleAlert } from 'lucide-react'
import { FieldError } from '@/components/FieldError'
import { Page } from '@/components/Shell'
import { Speakable } from '@/components/Speakable'
import { useApp } from '@/context/AppContext'
import { FX, lookupPaynow, payeeName } from '@/data/bank'
import { flowById, type FlowField } from '@/data/flows'
import { translate } from '@/i18n'
import { formatSGD } from '@/lib/format'
import { startGuide } from '@/lib/guide'
import { formatRate, nextRate } from '@/lib/rates'
import { beginShowHow, takeShowHow } from '@/lib/showHow'
import { speak } from '@/lib/speech'
import { validateForm, type Issue } from '@/lib/validate'

export function FlowPage() {
  const { flowId = '' } = useParams()
  const flow = flowById(flowId)
  const app = useApp()
  const prefsRef = useRef(app.prefs)
  prefsRef.current = app.prefs
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const practice = params.get('practice') === '1'
  const touring = params.get('tour') === '1'
  const demo = params.get('demo')
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [form, setForm] = useState<Record<string, string>>({})
  const [issues, setIssues] = useState<Issue[]>([])
  const [stage, setStage] = useState<'form' | 'review' | 'otp' | 'done'>('form')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [unusual, setUnusual] = useState(false)
  const [ref, setRef] = useState('')
  const [wstep, setWstep] = useState(0)
  const [more, setMore] = useState(false)
  const [highlights, setHighlights] = useState<string[]>([])
  const alertRef = useRef<HTMLDivElement>(null)
  const guided = useRef(false)

  useEffect(() => {
    if (!flow) return
    app.setScreen(flow.id)
    const next: Record<string, string> = {}
    flow.fields.forEach((field) => {
      next[field.id] = practice ? field.sample : field.type === 'account' || field.type === 'select' || field.type === 'toggle' ? field.sample : ''
    })
    const deposits = app.accounts.filter((account) => account.kind === 'deposit')
    flow.fields.forEach((field) => {
      if (field.type === 'account' && deposits.length && !deposits.some((account) => account.id === next[field.id])) {
        next[field.id] = deposits[0].id
      }
    })
    if (demo === 'mei' && flow.id === 'overseas') {
      next.name = 'Tan Wei Ming'
      next.country = 'Australia'
      next.swift = 'CTBAAU2S'
      next.account = '123456789'
      next.amount = '5000'
      next.from = '360'
    }
    let filled: string[] = []
    const rawFill = sessionStorage.getItem('ocbc-fill')
    if (rawFill) {
      try {
        const data = JSON.parse(rawFill) as { flow?: string; fields?: Record<string, string> }
        if (data.flow === flow.id && data.fields) {
          Object.assign(next, data.fields)
          filled = Object.keys(data.fields)
          sessionStorage.removeItem('ocbc-fill')
        }
      } catch {
        sessionStorage.removeItem('ocbc-fill')
      }
    }
    setHighlights(filled)
    setForm(next)
    setStage('form')
    setWstep(filled.length && wizardReview(flow.id) >= 0 ? wizardReview(flow.id) : 0)
    setMore(false)
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
        rate: () => prefsRef.current.speechRate,
        setRate: (rate) => app.updatePrefs({ speechRate: rate }),
        formatRate,
        nextRate,
        speak: (text, onRange) => speak(text, { language: prefsRef.current.language, rate: prefsRef.current.speechRate, dialect: prefsRef.current.dialect, onRange }),
        onMissing: (element, stepId) => {
          app.log('guide_step_missing', { guideId: flow.guideId, element, stepId })
          app.setNotice('')
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

  useEffect(() => {
    if (!flow) return
    const timer = window.setTimeout(() => {
      const job = takeShowHow(flow.id)
      if (!job) return
      const result = beginShowHow(app, () => prefsRef.current, job.journeyId, job.practice, t)
      if (!result?.started) app.setNotice(t('guideEmpty'))
    }, 400)
    return () => window.clearTimeout(timer)
    // The walkthrough starts once when this flow opens from the assistant.
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
      <Page title={t('notFound.title')} back>
        <p className="p-4">{t('guideEmpty')}</p>
      </Page>
    )
  }

  const title = flow.id === 'card-lock' ? t('flows.cardLock') : flow.id === 'card-lost' ? t('flows.cardLost') : flow.id === 'limit' ? t('flows.limit') : t(flow.title)
  const balance = app.balances[form.from || '360'] ?? 0
  const payee = flow.payeeField ? form[flow.payeeField] : ''
  const paynowHit = flow.id === 'paynow' || flow.id === 'topup' ? lookupPaynow(form.to || '', form.proxy || 'mobile') : null
  const lookedUp = paynowHit?.status === 'ok' ? paynowHit.name : ''
  const displayPayee = lookedUp || payeeName(payee)
  const reviewAt = wizardReview(flow.id)
  const stepIds = wizardFields(flow.id, wstep)
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

  const focusIssues = (found: Issue[]) => {
    if (!found.length) return
    const id = `field-${found[0].field}`
    window.setTimeout(() => {
      const el = document.getElementById(id)
      el?.scrollIntoView({ block: 'center' })
      el?.focus()
    }, 0)
  }

  const changeField = (id: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [id]: value }
      setIssues((current) => {
        if (!current.some((issue) => issue.field === id)) return current
        const still = validateForm(flow.id, next, balance).filter((issue) => issue.field === id)
        const nextIssues = [...current.filter((issue) => issue.field !== id), ...still]
        if (!nextIssues.length) app.setAnnounce('')
        return nextIssues
      })
      return next
    })
    app.setScreen(flow.id, id)
  }

  const submit = () => {
    const found = validateForm(flow.id, form, balance)
    setIssues(found)
    found.forEach((issue) => app.log('error_shown', { code: issue.code, flowId: flow.id }))
    if (found.length) {
      if (app.prefs.readAloud) app.setAnnounce(describe(found[0]))
      focusIssues(found)
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
        const added = Number(form.monthly) || Number(form.target) || 0
        app.setGoals([...app.goals, { id: reference, name: form.name || 'Holiday', target: Number(form.target) || 0, monthly: Number(form.monthly) || 0, saved: added }])
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
              if (reviewAt >= 0 && wstep < reviewAt) {
                const ids = new Set(stepIds || [])
                const found = validateForm(flow.id, form, balance).filter((issue) => ids.has(issue.field))
                setIssues(found)
                found.forEach((issue) => app.log('error_shown', { code: issue.code, flowId: flow.id }))
                if (found.length) {
                  if (app.prefs.readAloud) app.setAnnounce(describe(found[0]))
                  focusIssues(found)
                  return
                }
                setWstep((value) => value + 1)
                return
              }
              if (reviewAt >= 0) {
                const found = validateForm(flow.id, form, balance)
                setIssues(found)
                found.forEach((issue) => app.log('error_shown', { code: issue.code, flowId: flow.id }))
                if (found.length) {
                  if (app.prefs.readAloud) app.setAnnounce(describe(found[0]))
                  focusIssues(found)
                  return
                }
                setStage('otp')
                return
              }
              submit()
            }}
          >
            {fx && (reviewAt < 0 || wstep >= 2) && (
              <section className="card space-y-1 p-3" aria-label={t('fx.sample')}>
                <p className="font-semibold">{t('fx.sample')}</p>
                <p>{t('fx.currency')}: {t(fx.currencyKey)}</p>
                <p>{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</p>
                <p>{t('fx.fee', { fee: formatSGD(fx.fee) })}</p>
                <p>{t('fx.received', { amount: `${t(fx.currencyKey)} ${received.toFixed(2)}` })}</p>
                <p className="text-[var(--muted)]">{t('fx.accountHint', { hint: t(`fx.hint.${fx.account}`) })}</p>
              </section>
            )}
            {flow.id === 'overseas' && app.payees.length > 0 && (
              <section className="card space-y-2 p-3">
                <p className="font-semibold">{t('savedPayees')}</p>
                {app.payees.map((payee) => (
                  <button
                    key={payee.id}
                    type="button"
                    className="min-h-12 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-left"
                    onClick={() => setForm((prev) => ({ ...prev, name: payee.name, country: payee.country }))}
                  >
                    {payee.label}
                  </button>
                ))}
              </section>
            )}
            {issues.length > 1 && (
              <div ref={alertRef} tabIndex={-1} role="alert" className="rounded-xl border-l-4 border-[#9f1239] bg-[#FDECEC] p-3 text-[15px] font-bold text-[#9f1239]">
                <p className="flex items-center gap-2 font-bold">
                  <CircleAlert aria-hidden size={18} /> {t('errors.count', { n: issues.length })}
                </p>
                <ul className="mt-2 space-y-1">
                  {issues.map((issue) => (
                    <li key={`${issue.field}-${issue.code}`}>
                      <a className="font-semibold underline" href={`#field-${issue.field}`} onClick={(event) => { event.preventDefault(); document.getElementById(`field-${issue.field}`)?.focus() }}>
                        {describe(issue)}
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  {issues.some((issue) => issue.code === 'insufficient') && (
                    <button type="button" className="min-h-11 flex-1 rounded-xl border border-[var(--danger)] px-2 font-semibold" onClick={() => changeField('amount', Math.max(0, balance).toFixed(2))}>{t('errors.useMax')}</button>
                  )}
                  <button type="button" className="min-h-11 flex-1 rounded-xl border border-[var(--danger)] px-2 font-semibold" onClick={() => app.openHelp('staff')}>{t('getHelp')}</button>
                </div>
                {app.prefs.readAloud && <Speakable text={issues.map(describe).join('. ')} auto hideText />}
              </div>
            )}
            {reviewAt >= 0 && wstep === reviewAt && (
              <section className="card space-y-2 p-3">
                <h2 className="text-lg font-semibold">{t('review')}</h2>
                {flow.fields.filter((field) => !moreFields(flow.id).includes(field.id) && field.id !== 'laterDate').map((field) => (
                  <p key={field.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--muted)]">{t(field.label)}</span>
                    <span className="text-right font-semibold">{display(field, form[field.id] || '', t)}</span>
                  </p>
                ))}
                {lookedUp && <p className="font-semibold">{lookedUp}</p>}
                {fx && (
                  <>
                    <p className="flex justify-between gap-3 text-sm"><span className="text-[var(--muted)]">{t('success.rate')}</span><span className="money text-right font-semibold">{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</span></p>
                    <p className="flex justify-between gap-3 text-sm"><span className="text-[var(--muted)]">{t('success.fee')}</span><span className="money text-right font-semibold">{formatSGD(fx.fee)}</span></p>
                    <p className="flex justify-between gap-3 text-sm"><span className="text-[var(--muted)]">{t('success.received')}</span><span className="money text-right font-semibold">{t(fx.currencyKey)} {received.toFixed(2)}</span></p>
                    <p className="text-sm text-[var(--muted)]">{t('ai.sampleRate')}</p>
                  </>
                )}
              </section>
            )}
            {groups.filter((group) => group.fields.some((field) => field.id !== 'lock' && (touring || !stepIds || stepIds.includes(field.id)))).map((group) => (
              <fieldset key={group.guide} className="card space-y-3 p-3">
                {group.fields.map((field) => {
                  if (moreFields(flow.id).includes(field.id)) return null
                  if (!touring && stepIds && !stepIds.includes(field.id)) return null
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
                    options={field.type === 'account' ? app.accounts.filter((account) => account.kind === 'deposit').map((account) => ({ value: account.id, label: account.nameKey })) : undefined}
                    highlight={highlights.includes(field.id)}
                    error={issues.find((issue) => issue.field === field.id) ? describe(issues.find((issue) => issue.field === field.id) as Issue) : ''}
                    balanceHint={field.id === 'amount' || field.id === 'from' ? t('flows.available', { amount: formatSGD(balance) }) : ''}
                    onChange={(value) => changeField(field.id, value)}
                    t={t}
                  />
                  )
                })}
                {(flow.id === 'paynow' || flow.id === 'topup') && group.fields.some((field) => field.id === 'to') && paynowHit?.status === 'ok' && (
                  <p className="text-sm font-semibold">{t('flows.nameCheck', { name: paynowHit.name || '' })}</p>
                )}
                {(flow.id === 'paynow' || flow.id === 'topup') && group.fields.some((field) => field.id === 'to') && paynowHit?.status === 'bad' && (
                  <p className="flex items-start gap-2 text-sm font-semibold text-[var(--danger)]">
                    <TriangleAlert aria-hidden className="mt-0.5 shrink-0" size={18} />
                    {t('flows.nameUnknown')}
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
            {(touring || (reviewAt >= 0 && wstep === reviewAt)) && (
              <div className="card p-3">
                <button type="button" className="flex min-h-11 w-full items-center justify-between gap-2 font-semibold" aria-expanded={more || touring} onClick={() => setMore((value) => !value)}>
                  {t('flows.moreOptions')}
                  <ChevronDown aria-hidden className={more || touring ? 'rotate-180' : ''} />
                </button>
                {(more || touring) && <div className="mt-3 space-y-3">
                  {flow.fields.filter((field) => moreFields(flow.id).includes(field.id) && (field.id !== 'laterDate' || form.when === 'later')).map((field) => (
                    <Field
                      key={field.id}
                      field={field}
                      value={form[field.id] ?? ''}
                      onChange={(value) => changeField(field.id, value)}
                      t={t}
                    />
                  ))}
                </div>}
              </div>
            )}
            {reviewAt >= 0 && wstep > 0 && (
              <button type="button" className="text-sm font-semibold text-[var(--link)]" onClick={() => { setIssues([]); setWstep((value) => value - 1) }}>{t('back')}</button>
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
              <p key={field.id} className={app.prefs.textSize >= 20 ? 'flex min-w-0 flex-col gap-1' : 'flex min-w-0 justify-between gap-3'}>
                <span className="text-[var(--muted)]">{field.id === 'account' && fx?.account === 'iban' ? t('flows.iban') : t(field.label)}</span>
                <span className="money min-w-0 font-semibold">{display(field, form[field.id] || '', t)}</span>
              </p>
            ))}
            {fx && (
              <>
                <p className={app.prefs.textSize >= 20 ? 'flex flex-col gap-1' : 'flex justify-between gap-3'}><span className="text-[var(--muted)]">{t('success.rate')}</span><span className="money font-semibold">{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</span></p>
                <p className={app.prefs.textSize >= 20 ? 'flex flex-col gap-1' : 'flex justify-between gap-3'}><span className="text-[var(--muted)]">{t('success.fee')}</span><span className="money font-semibold">{formatSGD(fx.fee)}</span></p>
                <p className={app.prefs.textSize >= 20 ? 'flex flex-col gap-1' : 'flex justify-between gap-3'}><span className="text-[var(--muted)]">{t('success.received')}</span><span className="money font-semibold">{t(fx.currencyKey)} {received.toFixed(2)}</span></p>
              </>
            )}
            {flow.id === 'card-lost' && <p>{t('flows.lostNote')}</p>}
            <button type="button" className="ocbc-btn" onClick={() => { if (flow.kind === 'payment') { setOtp(''); setOtpError(''); setStage('otp') } else confirm() }}>{flow.kind === 'payment' ? t('continue') : t('confirm')}</button>
            <button type="button" className="tap w-full" onClick={() => setStage('form')}>{t('back')}</button>
          </section>
        )}
        {stage === 'otp' && (
          <section className="card space-y-3 p-4">
            <h2 className="text-lg font-semibold" id="otp-title">{t('flows.otpTitle')}</h2>
            <p className="text-sm text-[var(--muted)]">{t('flows.otpBody')}</p>
            <input id="demo-otp" aria-labelledby="otp-title" aria-invalid={otpError ? true : undefined} aria-describedby={otpError ? 'otp-error' : undefined} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => { setOtp(e.target.value); if (/^\d{6}$/.test(e.target.value.trim())) { setOtpError(''); app.setAnnounce('') } }} className={`ocbc-field ${otpError ? 'is-invalid' : ''}`} />
            <FieldError id="otp-error">{otpError}</FieldError>
            <button
              type="button"
              className="ocbc-btn"
              onClick={() => {
                if (!/^\d{6}$/.test(otp.trim())) {
                  setOtpError(t('errors.otp'))
                  window.setTimeout(() => {
                    const el = document.getElementById('demo-otp')
                    el?.scrollIntoView({ block: 'center' })
                    el?.focus()
                  }, 0)
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
              <h2 className="min-w-0 text-lg font-semibold leading-snug text-[var(--success)]">
                <span aria-hidden>✓</span> {practice ? t('practice.doneTitle') : flow.id === 'goal' ? t('success.goalAdded', { amount: formatSGD(Number(form.monthly) || Number(form.target) || 0), name: form.name || 'Holiday' }) : t('success.title')}
              </h2>
              <Speakable text={practice ? t('practice.done') : t('success.summarySpoken', { amount: formatSGD(sendAmount), name: displayPayee || title, ref })} auto={app.prefs.readAloud} hideText />
            </div>
            <dl className="space-y-2">
              {flow.id !== 'goal' && <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('amount')}</dt><dd className="money font-semibold">{formatSGD(sendAmount)}</dd></div>}
              <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.payee')}</dt><dd className="min-w-0 font-semibold">{displayPayee || form.name || title}</dd></div>
              <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.reference')}</dt><dd className="money font-semibold">{ref}</dd></div>
              <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.when')}</dt><dd className="money font-semibold">{form.when === 'later' && form.laterDate ? form.laterDate : new Date().toISOString().slice(0, 10)}</dd></div>
              {fx && (
                <>
                  <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.fee')}</dt><dd className="money font-semibold">{formatSGD(fx.fee)}</dd></div>
                  <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.rate')}</dt><dd className="money font-semibold">{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</dd></div>
                  <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.received')}</dt><dd className="money font-semibold">{t(fx.currencyKey)} {received.toFixed(2)}</dd></div>
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
    if (option) return t(option.label)
    if (value === 'frank') return t('accounts.frank')
    if (value === '360') return t('accounts.a360')
    if (value === 'savings') return t('accounts.savings')
    return value
  }
  if (field.id === 'savePayee') return value === 'yes' ? t('yes') : t('no')
  if (field.type === 'toggle') return value === 'no' ? t('flows.unlocked') : t('flows.locked')
  if (field.type === 'amount') return formatSGD(Number(value || 0))
  return value
}

function wizardReview(flowId: string) {
  if (flowId === 'overseas') return 3
  if (flowId === 'paynow' || flowId === 'transfer') return 2
  return -1
}

function wizardFields(flowId: string, step: number) {
  if (wizardReview(flowId) < 0) return null
  if (flowId === 'paynow') return step === 0 ? ['proxy', 'to'] : step === 1 ? ['amount', 'from'] : []
  if (flowId === 'transfer') return step === 0 ? ['name', 'bank', 'account'] : step === 1 ? ['amount', 'from'] : []
  return step === 0 ? ['country'] : step === 1 ? ['name', 'swift', 'account'] : step === 2 ? ['amount', 'from'] : []
}

function moreFields(flowId: string) {
  if (flowId === 'paynow') return ['reference', 'savePayee', 'when', 'laterDate']
  if (flowId === 'transfer') return ['savePayee', 'when', 'laterDate']
  if (flowId === 'overseas') return ['purpose', 'savePayee', 'when', 'laterDate']
  return []
}

function Field({
  field,
  value,
  onChange,
  t,
  label,
  hint,
  placeholder,
  options,
  error,
  balanceHint,
  highlight,
}: {
  field: FlowField
  value: string
  onChange: (value: string) => void
  t: (key: string) => string
  label?: string
  hint?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  error?: string
  balanceHint?: string
  highlight?: boolean
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
  const errorId = error ? `${id}-error` : undefined
  const invalid = error ? true : undefined
  return (
    <label className="block min-w-0" htmlFor={id} data-guide={field.guide}>
      <span className="mb-1 block text-[12px] font-medium text-[var(--muted)]">
        {label || t(field.label)} {field.placeholder === 'optional' && <span className="font-normal text-[var(--muted)]">({t('optional')})</span>}
      </span>
      {hint && <span className="mb-1 block text-[0.85rem] font-normal text-[var(--muted)]">{hint}</span>}
      {field.type === 'select' || field.type === 'account' ? (
        <select id={id} value={value} aria-invalid={invalid} aria-describedby={errorId} onChange={(e) => onChange(e.target.value)} className={`ocbc-field ${error ? 'is-invalid' : ''} ${highlight ? 'ocbc-filled' : ''}`}>
          {(options || field.options)?.map((option) => (
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
          aria-invalid={invalid}
          aria-describedby={errorId}
          onChange={(e) => onChange(e.target.value)}
          className={`ocbc-field ${error ? 'is-invalid' : ''} ${highlight ? 'ocbc-filled' : ''} ${field.type === 'amount' ? 'text-center text-[28px] font-semibold' : ''}`}
        />
      )}
      {balanceHint && <span className="mt-1 block text-sm text-[var(--muted)]">{balanceHint}</span>}
      <FieldError id={errorId}>{error}</FieldError>
    </label>
  )
}
