import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChevronsRight, CircleAlert, TriangleAlert } from 'lucide-react'
import { FieldError } from '@/components/FieldError'
import { Page } from '@/components/Shell'
import { Speakable } from '@/components/Speakable'
import { useApp } from '@/context/AppContext'
import { FX, lookupPaynow, maskPayee, payeeName } from '@/data/bank'
import { flowById, type FlowField } from '@/data/flows'
import { translate } from '@/i18n'
import { formatMoney } from '@/lib/format'
import { getFlowTour, startGuide, subscribeFlowTour } from '@/lib/guide'
import { formatRate, nextRate } from '@/lib/rates'
import { beginShowHow, peekShowHow, takeShowHow } from '@/lib/showHow'
import { speak } from '@/lib/speech'
import { assessTransferRisk, candidateKeys, loadRiskConfig, type RiskLevel, type RiskReason } from '@/lib/transferRisk'
import { loadTransferHistory, recordTransfer } from '@/lib/transferHistory'
import { validateForm, type Issue } from '@/lib/validate'
import { ScamSheet } from '@/components/ScamSheet'

export function FlowPage() {
  const { flowId = '' } = useParams()
  const flow = flowById(flowId)
  const app = useApp()
  const prefsRef = useRef(app.prefs)
  prefsRef.current = app.prefs
  const whoRef = useRef({ id: app.profile.id, mei: app.payees.some((payee) => payee.name === 'Tan Wei Ming') })
  whoRef.current = { id: app.profile.id, mei: app.payees.some((payee) => payee.name === 'Tan Wei Ming') }
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const practice = params.get('practice') === '1'
  const touring = params.get('tour') === '1'
  const demo = params.get('demo')
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [form, setForm] = useState<Record<string, string>>({})
  const [issues, setIssues] = useState<Issue[]>([])
  const [stage, setStage] = useState<'form' | 'review' | 'otp' | 'processing' | 'done'>('form')
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState('')
  const [guard, setGuard] = useState<{
    amount: number
    name: string
    level: RiskLevel
    reasons: RiskReason[]
    words: string[]
    dayTotal: number
    usual: number
    payeeKey: string
  } | null>(null)
  const proceedRef = useRef<(() => void) | null>(null)
  const [ref, setRef] = useState('')
  const [wstep, setWstep] = useState(0)
  const [directory] = useState(true)
  const [payeeLabel, setPayeeLabel] = useState('')
  const [showBal, setShowBal] = useState(false)
  const [fromOpen, setFromOpen] = useState(false)
  const [confirmPay, setConfirmPay] = useState(false)
  const [highlights, setHighlights] = useState<string[]>([])
  const guideOn = useSyncExternalStore(subscribeFlowTour, () => getFlowTour()?.guideId === (flow?.guideId || ''), () => false)
  const alertRef = useRef<HTMLDivElement>(null)
  const guided = useRef(false)

  useEffect(() => {
    const root = document.getElementById('customer-root')
    if (!root) return
    if (stage === 'review' || stage === 'otp') root.setAttribute('data-hide-fab', '1')
    else root.removeAttribute('data-hide-fab')
    window.dispatchEvent(new Event('ocbc-chrome'))
    return () => {
      root.removeAttribute('data-hide-fab')
      window.dispatchEvent(new Event('ocbc-chrome'))
    }
  }, [stage])

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
    if ((flow.id === 'card-lock' || flow.id === 'card-lost') && params.get('card')) {
      next.card = params.get('card') || 'debit'
      next.lock = 'yes'
    }
    if (demo === 'mei' && flow.id === 'overseas') {
      next.name = 'Tan Wei Ming'
      next.country = 'Australia'
      next.swift = 'CTBAAU2S'
      next.account = '12345678'
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
    if (flow.id === 'paynow' && practice) {
      const mei = app.profile.id === 'auntiemei' || app.profile.id === 'persona-mei' || app.payees.some((payee) => payee.name === 'Tan Wei Ming')
      next.to = mei ? '91234567' : '81234567'
    }
    setHighlights(filled)
    setForm(next)
    const known = PAYNOW_CONTACTS.find((contact) => contact.mobile === next.to)
    if (known) setPayeeLabel(known.name)
    setStage('form')
    setWstep(filled.length && wizardReview(flow.id) >= 0 ? wizardReview(flow.id) : 0)
    if (demo === 'mei' && flow.id === 'overseas') {
      const found = validateForm(flow.id, next, app.balances['360'] ?? 0, app.payees)
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
    guided.current = false
    if (!flow || params.get('tour') !== '1') return
    const timer = window.setTimeout(() => {
      if (guided.current) return
      guided.current = true
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
    const sync = () => {
      const tour = getFlowTour()
      if (!tour || tour.guideId !== 'paynow') return
      const id = tour.steps[tour.index]?.id
      const mei = whoRef.current.id === 'auntiemei' || whoRef.current.id === 'persona-mei' || whoRef.current.mei
      const contact = PAYNOW_CONTACTS.find((item) => item.name === (mei ? 'Tan Wei Ming' : 'Siti Aminah')) || PAYNOW_CONTACTS[0]
      if (id === 'who') {
        setStage('form')
        setWstep(0)
      } else if (id === 'name') {
        setPayeeLabel(contact.name)
        setForm((prev) => ({ ...prev, proxy: 'mobile', to: contact.mobile }))
        setStage('form')
        setWstep(0)
      } else if (id === 'amount') {
        setPayeeLabel(contact.name)
        setForm((prev) => ({ ...prev, proxy: 'mobile', to: prev.to || contact.mobile, amount: '10.00' }))
        setStage('form')
        setWstep(1)
      } else if (id === 'review' || id === 'slider') {
        setPayeeLabel(contact.name)
        setForm((prev) => ({ ...prev, proxy: 'mobile', to: prev.to || contact.mobile, amount: prev.amount && Number(prev.amount) > 0 ? prev.amount : '10.00' }))
        setStage('review')
      }
    }
    window.addEventListener('ocbc-guide-step', sync)
    return () => window.removeEventListener('ocbc-guide-step', sync)
  }, [])

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
  const showAll = touring || guideOn || peekShowHow(flow.id)
  const fx = flow.id === 'overseas' ? FX[form.country] || FX.Australia : null
  const shown = (field: FlowField) => {
    if (field.id === 'lock') return false
    if (field.id === 'card' && params.get('card')) return false
    if (flow.id === 'paynow' && wstep === 1 && ['amount', 'from', 'reference', 'savePayee', 'when', 'laterDate'].includes(field.id)) return false
    if (!showAll && stepIds && !stepIds.includes(field.id)) return false
    if (field.id === 'laterDate' && form.when !== 'later') return false
    if (field.id === 'swift' && fx?.account === 'iban') return false
    return true
  }
  const sendAmount = Number(String(form.amount || '').replace(/,/g, '')) || 0
  const received = fx ? Math.max(0, sendAmount - fx.fee) * fx.perSgd : 0

  const describe = (issue: Issue) => {
    const field = flow.fields.find((item) => item.id === issue.field)
    const params: Record<string, string | number> = { ...(issue.params || {}) }
    if (field && params.field) params.field = t(field.label)
    if (issue.code === 'insufficient') params.available = formatMoney(Number(issue.params?.available ?? balance))
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
        const still = validateForm(flow.id, next, balance, app.payees).filter((issue) => issue.field === id)
        const nextIssues = [...current.filter((issue) => issue.field !== id), ...still]
        if (!nextIssues.length) app.setAnnounce('')
        return nextIssues
      })
      return next
    })
    app.setScreen(flow.id, id)
  }

  const submit = () => {
    const found = validateForm(flow.id, form, balance, app.payees)
    setIssues(found)
    found.forEach((issue) => app.log('error_shown', { code: issue.code, flowId: flow.id }))
    if (found.length) {
      if (app.prefs.readAloud) app.setAnnounce(describe(found[0]))
      focusIssues(found)
      return
    }
    const amount = Number(String(form[flow.amountField || ''] || '').replace(/,/g, ''))
    if (openScamCheck(amount, () => { setIssues([]); setStage('review') })) return
    setIssues([])
    setStage('review')
  }

  const openScamCheck = (amount: number, proceed: () => void) => {
    const watched = ['paynow', 'transfer', 'overseas', 'scan', 'bill', 'giro', 'topup']
    if (!watched.includes(flow.id) || !flow.amountField) return false
    const keys = candidateKeys(flow.id, form)
    const history = loadTransferHistory(app.profile.id)
    const result = assessTransferRisk({
      flowId: flow.id,
      amount,
      keys,
      payees: app.payees,
      history,
      text: [form.reference, form.purpose, form.note, form.message].filter(Boolean).join(' '),
      usualTransfer: app.profile.usualTransfer,
      config: loadRiskConfig(),
    })
    if (result.level === 'none') return false
    proceedRef.current = proceed
    app.log('scam_check', { trigger: result.reasons.join(','), level: result.level, reasons: result.reasons.join(','), answers: '', result: 'shown', screen: flow.id, amount })
    setGuard({
      amount,
      name: displayPayee || t('flows.recipient'),
      level: result.level,
      reasons: result.reasons,
      words: result.words,
      dayTotal: result.dayTotal,
      usual: app.profile.usualTransfer,
      payeeKey: keys[0] || flow.id,
    })
    return true
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
        const keys = candidateKeys(flow.id, form)
        if (keys[0]) recordTransfer({ userId: app.profile.id, payeeKey: keys[0], amount, at: Date.now() })
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
    if (flow.id === 'card-lock' || flow.id === 'card-lost') {
      setStage('done')
    } else {
      setStage('processing')
      window.setTimeout(() => setStage('done'), 1200)
    }
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
          <p data-guide="limit-current" className="card p-3 font-semibold">{t('flows.currentLimit', { amount: formatMoney(app.limit) })}</p>
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
                const found = validateForm(flow.id, form, balance, app.payees).filter((issue) => ids.has(issue.field))
                setIssues(found)
                found.forEach((issue) => app.log('error_shown', { code: issue.code, flowId: flow.id }))
                if (found.length) {
                  if (app.prefs.readAloud) app.setAnnounce(describe(found[0]))
                  focusIssues(found)
                  return
                }
                const amount = Number(String(form[flow.amountField || ''] || '').replace(/,/g, ''))
                if (wstep + 1 === reviewAt && openScamCheck(amount, () => setWstep(reviewAt))) return
                setWstep((value) => value + 1)
                return
              }
              if (reviewAt >= 0) {
                const found = validateForm(flow.id, form, balance, app.payees)
                setIssues(found)
                found.forEach((issue) => app.log('error_shown', { code: issue.code, flowId: flow.id }))
                if (found.length) {
                  if (app.prefs.readAloud) app.setAnnounce(describe(found[0]))
                  focusIssues(found)
                  return
                }
                setStage('review')
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
                <p>{t('fx.fee', { fee: formatMoney(fx.fee) })}</p>
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
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        name: payee.name,
                        country: payee.country || prev.country,
                        swift: payee.swift || prev.swift,
                        account: payee.account || prev.account,
                      }))
                      setWstep(1)
                    }}
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
                {flow.fields.filter((field) => field.id !== 'laterDate' && field.id !== 'lock').map((field) => (
                  <p key={field.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-[var(--muted)]">{t(field.label)}</span>
                    <span className="text-right font-semibold">{display(field, form[field.id] || '', t)}</span>
                  </p>
                ))}
                {lookedUp && <p className="font-semibold">{lookedUp}</p>}
                {fx && (
                  <>
                    <p className="flex justify-between gap-3 text-sm"><span className="text-[var(--muted)]">{t('success.rate')}</span><span className="money text-right font-semibold">{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</span></p>
                    <p className="flex justify-between gap-3 text-sm"><span className="text-[var(--muted)]">{t('success.fee')}</span><span className="money text-right font-semibold">{formatMoney(fx.fee)}</span></p>
                    <p className="flex justify-between gap-3 text-sm"><span className="text-[var(--muted)]">{t('success.received')}</span><span className="money text-right font-semibold">{t(fx.currencyKey)} {received.toFixed(2)}</span></p>
                    <p className="text-sm text-[var(--muted)]">{t('ai.sampleRate')}</p>
                  </>
                )}
              </section>
            )}
            {flow.id === 'paynow' && directory && wstep === 0 && (
              <section className="space-y-3">
                <div role="tablist" data-guide="paynow-id-tabs" aria-label={t('flows.proxyType')} className="grid grid-cols-3" onKeyDown={(event) => {
                  const order = ['mobile', 'nric', 'uen']
                  const index = order.indexOf(form.proxy || 'mobile')
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    const nextIndex = (index + (event.key === 'ArrowRight' ? 1 : order.length - 1)) % order.length
                    const next = order[nextIndex]
                    setForm((prev) => ({ ...prev, proxy: next, to: '' }))
                    const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
                    tabs[nextIndex]?.focus()
                  }
                }}>
                  {(['mobile', 'nric', 'uen'] as const).map((id) => (
                    <button key={id} type="button" role="tab" aria-selected={(form.proxy || 'mobile') === id} className={`min-h-11 text-[14px] ${(form.proxy || 'mobile') === id ? 'border-b-2 border-[#E30613] font-bold text-[#E30613]' : 'font-normal text-[var(--text)]'}`} onClick={() => setForm((prev) => ({ ...prev, proxy: id, to: '' }))}>
                      {t(id === 'mobile' ? 'flows.mobile' : id === 'nric' ? 'look.nric' : 'look.uen')}
                    </button>
                  ))}
                </div>
                <input id="paynow-mobile" data-guide="paynow-to" inputMode={form.proxy === 'mobile' || !form.proxy ? 'tel' : 'text'} className="ocbc-field" placeholder={t(form.proxy === 'nric' ? 'look.nricPh' : form.proxy === 'uen' ? 'look.uenPh' : 'look.mobilePh')} aria-label={t('look.searchPayee')} value={form.to || ''} onChange={(event) => setForm((prev) => ({ ...prev, to: event.target.value }))} />
                {(form.proxy || 'mobile') === 'mobile' && (
                <>
                <div className="flex gap-4 border-b border-[var(--line)] text-[15px]">
                  <span className="border-b-2 border-[#E30613] pb-2 font-semibold">{t('look.recentTab')}</span>
                  <span className="pb-2 text-[var(--muted)]">{t('look.contactsTab')}</span>
                </div>
                {(app.payees.some((payee) => payee.name === 'Tan Wei Ming') ? PAYNOW_CONTACTS.filter((contact) => contact.name === 'Tan Wei Ming') : PAYNOW_CONTACTS.filter((contact) => contact.name !== 'Tan Wei Ming')).map((contact) => (
                  <button key={contact.mobile} type="button" className="flex min-h-11 w-full items-center gap-3 text-left" onClick={() => { setPayeeLabel(contact.name); setForm((prev) => ({ ...prev, proxy: 'mobile', to: contact.mobile })); setWstep(1) }}>
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--soft)] text-[12px] font-bold">{contact.name.slice(0, 1)}</span>
                    <span>
                      <span className="block font-bold">{contact.name}</span>
                      <span className="block text-[13px] text-[var(--muted)]">+65{contact.mobile.slice(0, 4)}••••</span>
                    </span>
                  </button>
                ))}
                <button type="button" className="min-h-11 font-semibold text-[var(--link)] underline" onClick={() => document.getElementById('paynow-mobile')?.focus()}>{t('look.enterMobile')}</button>
                </>
                )}
                {lookupPaynow(form.to || '', form.proxy || 'mobile').status === 'ok' && (
                  <button type="button" data-guide="paynow-name" className="flex min-h-11 w-full items-center text-left font-bold" onClick={() => { setPayeeLabel(payeeName(form.to) || ''); setWstep(1) }}>
                    {lookupPaynow(form.to || '', form.proxy || 'mobile').name}
                  </button>
                )}
                {lookupPaynow(form.to || '', form.proxy || 'mobile').status === 'unknown' && (
                  <p role="alert" className="rounded-xl border border-[var(--danger)] p-3 font-semibold text-[var(--danger)]">{t('flows.nameUnknown')}</p>
                )}
              </section>
            )}
            {!(flow.id === 'paynow' && directory && wstep === 0) && groups.map((group) => {
              const fields = group.fields.filter(shown)
              if (!fields.length) return null
              return (
              <fieldset key={group.guide} className="card space-y-3 p-3">
                {fields.map((field) => {
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
                    balanceHint={field.id === 'from' ? t('flows.available', { amount: formatMoney(balance) }) : ''}
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
              )
            })}
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
            {flow.id === 'paynow' && wstep === 1 && (
              <section className="space-y-3">
                <p className="text-[14px] text-[var(--muted)]">{t('look.payTo')}</p>
                <p className="text-[22px] font-bold">{maskPayee(payeeLabel || payeeName(form.to) || form.to || '')}</p>
                <p className="text-[13px] text-[var(--muted)]">+65 {String(form.to || '').replace(/\D/g, '').slice(0, 4)} ••••</p>
                <div data-guide="pay-amount" className="flex items-baseline gap-2">
                  <input data-guide="paynow-amount" className="w-full bg-transparent text-[32px] font-bold outline-none placeholder:text-[#A0A6AD]" inputMode="decimal" aria-label={t('amount')} placeholder="0.00" value={form.amount ? liveAmount(form.amount) : ''} onChange={(event) => changeField('amount', event.target.value.replace(/,/g, '').replace(/[^\d.]/g, ''))} onBlur={() => { const n = Number(form.amount); if (form.amount && !Number.isNaN(n)) changeField('amount', n.toFixed(2)) }} />
                  <span className="shrink-0 whitespace-nowrap text-[20px] font-bold text-[var(--muted)]">SGD</span>
                </div>
                <Link to="/flow/limit" className="block font-semibold text-[var(--link)] underline">{t('look.limitLeft', { amount: formatMoney(app.limit) })}</Link>
                <div data-guide="pay-message">
                  <input data-guide="paynow-reference" className="min-h-11 w-full rounded-full bg-[var(--soft)] px-4" maxLength={35} placeholder={t('look.addMessage')} aria-label={t('look.addMessage')} value={form.reference || ''} onChange={(event) => changeField('reference', event.target.value)} />
                </div>
                <button type="button" data-guide="pay-from" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 text-left" onClick={() => setFromOpen(true)}>
                  <span className="block text-[13px] text-[var(--muted)]">{t('flows.from')}</span>
                  <span className="block font-bold">{t(app.accounts.find((account) => account.id === form.from)?.nameKey || 'accounts.a360')}</span>
                </button>
                <button type="button" className="min-h-11 text-[14px] underline" onClick={() => setShowBal((value) => !value)}>{showBal ? `${t('look.available')} ${formatMoney(balance)}` : t('look.showBalance')}</button>
                {Number(form.amount) > app.limit && <p id="pay-alert" role="alert" className="rounded-lg border border-[#E30613] border-l-4 bg-[#FDECEC] p-3 text-[15px] font-bold text-[#1A1A1A]">{t('look.overLimit', { amount: formatMoney(app.limit) })} <Link to="/flow/limit" className="underline">{t('look.changeLimit')}</Link></p>}
                {Number(form.amount) > balance && Number(form.amount) <= app.limit && <p id="pay-alert" role="alert" className="rounded-lg border border-[#E30613] border-l-4 bg-[#FDECEC] p-3 text-[15px] font-bold text-[#1A1A1A]">{t('look.overBalance', { amount: formatMoney(balance) })}</p>}
                {Number(form.amount) <= 0 && <p id="pay-alert" className="text-[14px] text-[var(--muted)]">{t('look.enterAmount')}</p>}
              </section>
            )}
            {fromOpen && (
              <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setFromOpen(false)}>
                <div className="w-full rounded-t-2xl bg-[var(--card)] p-4" onClick={(event) => event.stopPropagation()}>
                  {app.accounts.filter((account) => account.kind === 'deposit').map((account) => (
                    <button key={account.id} type="button" className="block min-h-11 w-full text-left font-bold" onClick={() => { changeField('from', account.id); setFromOpen(false) }}>{t(account.nameKey)}</button>
                  ))}
                </div>
              </div>
            )}
            {!(flow.id === 'paynow' && (directory && wstep === 0 || wstep === 1)) && reviewAt >= 0 && wstep > 0 && (
              <button type="button" className="text-sm font-semibold text-[var(--link)]" onClick={() => { setIssues([]); setWstep((value) => value - 1) }}>{t('back')}</button>
            )}
            {!(flow.id === 'paynow' && directory && wstep === 0) && (
            <button type="submit" data-guide={flow.id === 'paynow' && wstep === 1 ? 'pay-next' : reviewGuide(flow.id)} aria-describedby={flow.id === 'paynow' && wstep === 1 ? 'pay-alert' : undefined} className={flow.id === 'paynow' && wstep === 1 ? 'min-h-12 w-full rounded-lg bg-[#E30613] font-bold text-white disabled:opacity-40' : 'ocbc-btn'} disabled={flow.id === 'paynow' && (Number(form.amount) <= 0 || Number(form.amount) > app.limit || Number(form.amount) > balance)}>
              {t('flows.submit')}
            </button>
            )}
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
            {flow.id === 'paynow' && <p data-guide="paynow-review-name" className="text-[22px] font-bold">{maskPayee(payeeLabel || payeeName(form.to) || form.to || '')}</p>}
            {flow.fields.filter((field) => {
              if (field.id === 'laterDate') return form.when === 'later'
              if (field.id === 'when') return form.when !== 'later'
              if (field.id === 'swift') return fx?.account !== 'iban'
              return true
            }).map((field) => (
              <p key={field.id} className={app.prefs.textSize >= 20 ? 'flex min-w-0 flex-col gap-1' : 'flex min-w-0 justify-between gap-3'}>
                <span className="text-[var(--muted)]">{field.id === 'account' && fx?.account === 'iban' ? t('flows.iban') : t(field.label)}</span>
                <span className="money min-w-0 whitespace-nowrap font-semibold">{field.id === 'to' ? maskProxy(form[field.id] || '', form.proxy) : display(field, form[field.id] || '', t)}</span>
              </p>
            ))}
            {fx && (
              <>
                <p className={app.prefs.textSize >= 20 ? 'flex flex-col gap-1' : 'flex justify-between gap-3'}><span className="text-[var(--muted)]">{t('success.rate')}</span><span className="money font-semibold">{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</span></p>
                <p className={app.prefs.textSize >= 20 ? 'flex flex-col gap-1' : 'flex justify-between gap-3'}><span className="text-[var(--muted)]">{t('success.fee')}</span><span className="money font-semibold">{formatMoney(fx.fee)}</span></p>
                <p className={app.prefs.textSize >= 20 ? 'flex flex-col gap-1' : 'flex justify-between gap-3'}><span className="text-[var(--muted)]">{t('success.received')}</span><span className="money font-semibold">{t(fx.currencyKey)} {received.toFixed(2)}</span></p>
              </>
            )}
            {flow.id === 'card-lost' && <p>{t('flows.lostNote')}</p>}
            {flow.kind === 'payment' && touring && !practice && <p className="font-semibold">{t('look.slidePractice')}</p>}
            {flow.kind === 'payment' ? (
              <PaySlider disabled={touring && !practice} label={practice || touring ? t('look.slidePractice') : t('look.slide')} ariaLabel={`${t('look.slide')} ${formatMoney(Number(form.amount) || 0)}`} guide={reviewGuide(flow.id)} onPay={() => { if (touring && !practice) return; setOtp(''); setOtpError(''); setStage('otp') }} />
            ) : null}
            {flow.kind === 'payment' ? (
              <button type="button" className="min-h-11 w-full text-[15px] font-semibold text-[var(--link)] underline" onClick={() => setConfirmPay(true)}>{t('look.tapToPay')}</button>
            ) : (
              <button type="button" className="ocbc-btn" onClick={() => confirm()}>{t('confirm')}</button>
            )}
            <button type="button" className="tap w-full" onClick={() => setStage('form')}>{t('back')}</button>
            {confirmPay && (
              <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
                <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-4">
                  <p className="text-lg font-bold">{t('look.payAsk', { amount: formatMoney(Number(form.amount) || 0), name: maskPayee(payeeLabel || form.name || form.to || '') })}</p>
                  <button type="button" className="ocbc-btn mt-3" onClick={() => { setConfirmPay(false); setOtp(''); setOtpError(''); setStage('otp') }}>{t('look.pay')}</button>
                  <button type="button" className="mt-2 min-h-11 w-full font-semibold underline" onClick={() => setConfirmPay(false)}>{t('cancel')}</button>
                </div>
              </div>
            )}
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
        {stage === 'processing' && (
          <section className="card p-8 text-center" role="status" aria-live="polite">
            <p className="text-[18px] font-bold">{t('look.processing')}</p>
          </section>
        )}
        {stage === 'done' && flow.id === 'card-lock' && (
          <section className="card space-y-3 p-4" role="status">
            <h2 className="text-lg font-bold text-[var(--success)]">{t('cards.debit')} •••• {app.cards.find((card) => card.id === form.card)?.last4 || '2291'} {form.lock === 'no' ? t('look.cardActive') : t('look.cardLocked')}</h2>
            <Link to="/" className="ocbc-btn">{t('backHome')}</Link>
            <Link to={`/flow/card-lock?card=${form.card || 'debit'}`} className="block min-h-11 text-center font-semibold text-[var(--link)] underline" onClick={() => { setForm((prev) => ({ ...prev, lock: prev.lock === 'no' ? 'yes' : 'no' })); setStage('form') }}>{form.lock === 'no' ? t('look.lockCard') : t('look.unlockCard')}</Link>
          </section>
        )}
        {stage === 'done' && flow.id !== 'card-lock' && (
          <section className="card space-y-3 p-4" role="status">
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 text-lg font-semibold leading-snug text-[var(--success)]">
                <span aria-hidden>✓</span> {practice ? t('practice.doneTitle') : flow.id === 'goal' ? t('success.goalAdded', { amount: formatMoney(Number(form.monthly) || Number(form.target) || 0), name: form.name || 'Holiday' }) : t('look.paid', { amount: formatMoney(sendAmount) })}
              </h2>
              <Speakable text={practice ? t('practice.done') : t('success.summarySpoken', { amount: formatMoney(sendAmount), name: displayPayee || title, ref })} auto={app.prefs.readAloud} hideText />
            </div>
            <dl className="space-y-2">
              {flow.id !== 'goal' && <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('amount')}</dt><dd className="money font-semibold">{formatMoney(sendAmount)}</dd></div>}
              <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.payee')}</dt><dd className="min-w-0 font-semibold">{displayPayee || form.name || title}</dd></div>
              <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.reference')}</dt><dd className="money font-semibold">{ref}</dd></div>
              <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.when')}</dt><dd className="money font-semibold">{form.when === 'later' && form.laterDate ? form.laterDate : new Intl.DateTimeFormat(app.prefs.language.startsWith('zh') ? 'zh-CN' : 'en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date())}</dd></div>
              {fx && (
                <>
                  <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.fee')}</dt><dd className="money font-semibold">{formatMoney(fx.fee)}</dd></div>
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
            <Link to={`/txn/${ref || 'latest'}`} className="block min-h-11 font-semibold text-[var(--link)] underline">{t('look.seeTxn')}</Link>
            <Link to="/pay" className="ocbc-btn">{t('look.goTransfers')}</Link>
            <Link to="/" className="tap flex items-center justify-center rounded-xl border border-[var(--line)]">{t('backHome')}</Link>
          </section>
        )}
      </div>
      {guard && (
        <ScamSheet
          amount={guard.amount}
          name={guard.name}
          level={guard.level}
          reasons={guard.reasons}
          words={guard.words}
          dayTotal={guard.dayTotal}
          usual={guard.usual}
          flowId={flow.id}
          onCancel={(answers) => {
            app.log('scam_check', { trigger: guard.reasons.join(','), level: guard.level, reasons: guard.reasons.join(','), answers, result: 'cancelled', screen: flow.id, amount: guard.amount })
            setGuard(null)
          }}
          onContinue={(answers) => {
            app.log('scam_check', { trigger: guard.reasons.join(','), level: guard.level, reasons: guard.reasons.join(','), answers, result: 'continued', screen: flow.id, amount: guard.amount })
            const proceed = proceedRef.current
            setGuard(null)
            proceed?.()
          }}
          onClose={() => setGuard(null)}
        />
      )}
    </Page>
  )
}

const PAYNOW_CONTACTS = [
  { name: 'Tan Wei Ming', mobile: '91234567' },
  { name: 'Siti Aminah', mobile: '81234567' },
  { name: 'Lim Jia Hui', mobile: '92345678' },
  { name: 'Nur Aisyah', mobile: '83456789' },
]

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
  if (field.type === 'amount') return formatMoney(Number(value || 0))
  return value
}

function wizardReview(flowId: string) {
  if (flowId === 'overseas') return 3
  if (flowId === 'paynow' || flowId === 'transfer') return 2
  return -1
}

function wizardFields(flowId: string, step: number) {
  if (wizardReview(flowId) < 0) return null
  if (flowId === 'paynow') return step === 0 ? ['proxy', 'to'] : step === 1 ? ['amount', 'from', 'reference', 'savePayee', 'when', 'laterDate'] : []
  if (flowId === 'transfer') return step === 0 ? ['name', 'bank', 'account'] : step === 1 ? ['amount', 'from', 'savePayee', 'when', 'laterDate'] : []
  return step === 0 ? ['country'] : step === 1 ? ['name', 'swift', 'account'] : step === 2 ? ['amount', 'from', 'purpose', 'savePayee', 'when', 'laterDate'] : []
}

function liveAmount(value: string) {
  const [whole, frac] = value.split('.')
  const grouped = Number(whole || '0').toLocaleString('en-SG')
  return frac === undefined ? grouped : `${grouped}.${frac}`
}

function maskProxy(value: string, proxy = 'mobile') {
  const raw = value.replace(/\s/g, '')
  if (!raw) return ''
  if (proxy === 'mobile' || !proxy) {
    const digits = raw.replace(/\D/g, '').replace(/^65/, '')
    return digits.length >= 4 ? `+65 ${digits.slice(0, 4)} ••••` : raw
  }
  return raw.length > 4 ? `${raw.slice(0, 4)} ••••` : raw
}

function PaySlider({ label, ariaLabel, guide, onPay, disabled }: { label: string; ariaLabel: string; guide?: string; onPay: () => void; disabled?: boolean }) {
  const [ratio, setRatio] = useState(0)
  const ratioRef = useRef(0)
  const drag = useRef<{ x: number; start: number } | null>(null)
  const move = (value: number) => {
    const next = Math.min(1, Math.max(0, value))
    ratioRef.current = next
    setRatio(next)
  }
  return (
    <div
      data-guide={guide}
      data-pay-review=""
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={`relative h-14 touch-none overflow-hidden rounded-full bg-[#2A3B43] text-white ${disabled ? 'opacity-60' : ''}`}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowRight') {
          event.preventDefault()
          onPay()
        }
      }}
      onPointerDown={(event) => {
        if (disabled) return
        drag.current = { x: event.clientX, start: ratioRef.current }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (!drag.current) return
        const width = event.currentTarget.clientWidth - 48
        move(drag.current.start + (event.clientX - drag.current.x) / Math.max(width, 1))
      }}
      onPointerUp={() => {
        const finished = ratioRef.current >= 0.85
        drag.current = null
        move(0)
        if (finished) onPay()
      }}
    >
      <span className="pointer-events-none absolute inset-0 grid place-items-center font-semibold underline">{label}</span>
      <span className="absolute top-2 grid h-10 w-10 place-items-center rounded-full bg-white text-[#2A3B43]" style={{ left: `calc(${ratio} * (100% - 48px) + 4px)` }}><ChevronsRight size={18} /></span>
    </div>
  )
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
      <label className="flex min-h-11 items-center justify-between gap-3 leading-normal" data-guide={field.guide}>
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
