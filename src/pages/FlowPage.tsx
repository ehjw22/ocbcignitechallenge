import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, Building2, ChevronRight, ChevronsRight, CircleAlert, CircleCheck, Eye, EyeOff, IdCard, KeyRound, Search, Smartphone, TriangleAlert } from 'lucide-react'
import { FieldError } from '@/components/FieldError'
import { Amount } from '@/components/ui/Amount'
import { Avatar } from '@/components/ui/Avatar'
import { Page } from '@/components/Shell'
import { Speakable } from '@/components/Speakable'
import { useApp } from '@/context/AppContext'
import { FX, lookupPaynow, maskPayee, payeeName } from '@/data/bank'
import { flowById, overseasSample, type FlowField } from '@/data/flows'
import { translate } from '@/i18n'
import { formatDraftAmount } from '@/lib/amount'
import { firstFillWizardStep, normaliseFillFields } from '@/lib/fillFields'
import { hiddenBlockingIssues, stepIssues } from '@/lib/flowStepIssues'
import { wizardFields, wizardReview } from '@/lib/flowWizard'
import { formatMoney } from '@/lib/format'
import { getFlowTour, startGuide, stopGuide, subscribeFlowTour } from '@/lib/guide'
import { guideStepFill, resolveDemoValue } from '@/lib/guideSync'
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
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const [continueTried, setContinueTried] = useState(false)
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
  const [shareNote, setShareNote] = useState('')
  const [highlights, setHighlights] = useState<string[]>([])
  const guideOn = useSyncExternalStore(subscribeFlowTour, () => getFlowTour()?.guideId === (flow?.guideId || ''), () => false)
  const alertRef = useRef<HTMLDivElement>(null)
  const guided = useRef(false)
  const tourLive = useRef(false)
  const tourFilled = useRef<Set<string>>(new Set())
  const accountsRef = useRef(app.accounts)
  accountsRef.current = app.accounts

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
    const deposits = app.accounts.filter((account) => account.kind === 'deposit')
    const next: Record<string, string> = {}
    const countrySample = flow.fields.find((field) => field.id === 'country')?.sample || 'Australia'
    flow.fields.forEach((field) => {
      const sample = resolveDemoValue(field, { accounts: deposits, country: next.country || countrySample })
      next[field.id] = practice || field.type === 'account' || field.type === 'select' || field.type === 'toggle' ? sample : ''
    })
    flow.fields.forEach((field) => {
      if (field.type === 'account' && deposits.length && !deposits.some((account) => account.id === next[field.id])) {
        next[field.id] = deposits[0].id
      }
    })
    if ((flow.id === 'card-lock' || flow.id === 'card-lost') && params.get('card')) {
      next.card = params.get('card') || 'debit'
      next.lock = 'yes'
    }
    if (demo === 'mei' && flow.id === 'overseas' && !practice) {
      next.name = 'Tan Wei Ming'
      next.country = 'Australia'
      next.swift = 'CTBAAU2S'
      next.account = '12345678'
      next.amount = '5000'
      next.from = deposits[0]?.id || next.from
    }
    let filled: string[] = []
    const rawFill = sessionStorage.getItem('ocbc-fill')
    if (rawFill) {
      try {
        const data = JSON.parse(rawFill) as { flow?: string; fields?: Record<string, string> }
        if (data.flow === flow.id && data.fields) {
          const merged = normaliseFillFields(flow.id, data.fields, {
            payees: app.payees,
            depositIds: deposits.map((account) => account.id),
          })
          Object.assign(next, merged)
          if (next.from && deposits.length && !deposits.some((account) => account.id === next.from)) next.from = deposits[0].id
          filled = Object.keys(merged)
        } else if (data.flow && data.flow !== flow.id) {
          /* leave the draft for the intended journey */
        }
      } catch {
        sessionStorage.removeItem('ocbc-fill')
      }
    }
    if (flow.id === 'paynow' && practice) {
      const mei = app.profile.id === 'auntiemei' || app.profile.id === 'persona-mei' || app.payees.some((payee) => payee.name === 'Tan Wei Ming')
      next.to = mei ? '98765432' : '91234567'
    }
    setHighlights(filled)
    setForm(next)
    const known = PAYNOW_CONTACTS.find((contact) => contact.mobile === next.to)
    if (known) setPayeeLabel(known.name)
    setStage('form')
    const fromBal = app.balances[next.from || deposits[0]?.id || '360'] ?? 0
    const fillStep = filled.length ? firstFillWizardStep(flow.id, next, fromBal, app.limit, app.payees) : 0
    // PayNow has a single review screen (stage 'review'), so a filled form opens on the amount step; Next then runs the scam check.
    setWstep(flow.id === 'paynow' && practice ? 1 : flow.id === 'paynow' ? Math.min(fillStep, 1) : fillStep)
    if (filled.length) window.setTimeout(() => sessionStorage.removeItem('ocbc-fill'), 0)
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
    if (!flow) return
    const sync = () => {
      const tour = getFlowTour()
      if (!tour || tour.guideId !== flow.guideId) {
        if (tourLive.current && !practice) {
          tourLive.current = false
          const filled = tourFilled.current
          tourFilled.current = new Set()
          const deposits = accountsRef.current.filter((account) => account.kind === 'deposit')
          setForm((prev) => {
            const next = { ...prev }
            filled.forEach((id) => {
              const field = flow.fields.find((item) => item.id === id)
              if (!field) return
              next[id] = field.type === 'text' || field.type === 'amount' ? '' : resolveDemoValue(field, { accounts: deposits })
            })
            return next
          })
          setPayeeLabel('')
          setStage('form')
          setWstep(0)
          if (new URLSearchParams(window.location.search).get('tour') === '1') {
            navigate(practice ? `/flow/${flow.id}?practice=1` : `/flow/${flow.id}`, { replace: true })
          }
        } else if (tourLive.current && practice && flow.id === 'paynow') {
          // Practice PayNow normally starts on the amount step (contact pre-filled); go back there if the guide ends on the recipient step.
          tourLive.current = false
          setWstep((value) => Math.max(value, 1))
        }
        return
      }
      tourLive.current = true
      const id = tour.steps[tour.index]?.id || ''
      const fill = guideStepFill(flow, id, { accounts: accountsRef.current })
      const mei = whoRef.current.id === 'auntiemei' || whoRef.current.id === 'persona-mei' || whoRef.current.mei
      const contact = PAYNOW_CONTACTS.find((item) => item.name === (mei ? 'Tan Wei Ming' : 'Siti Aminah')) || PAYNOW_CONTACTS[0]
      if (flow.id === 'paynow' && fill.values.to) {
        fill.values.to = contact.mobile
        fill.values.proxy = 'mobile'
        setPayeeLabel(contact.name)
      }
      Object.keys(fill.values).forEach((key) => tourFilled.current.add(key))
      setForm((prev) => ({ ...prev, ...fill.values }))
      // The guide shows the recipient step too (guide steps 1-2), so don't skip it in practice while touring.
      setWstep(fill.wstep)
      setStage(fill.stage)
      setIssues([])
    }
    window.addEventListener('ocbc-guide-step', sync)
    return () => window.removeEventListener('ocbc-guide-step', sync)
  }, [flow, practice])

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

  useEffect(() => {
    setTouched(new Set())
    setContinueTried(false)
    setIssues([])
  }, [wstep, flowId])

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
    if (showAll && reviewAt >= 0 && wstep === reviewAt) return false
    if (!showAll && stepIds && !stepIds.includes(field.id)) return false
    if (field.id === 'laterDate' && form.when !== 'later') return false
    if (field.id === 'swift' && fx?.account === 'iban') return false
    return true
  }
  const visibleFieldIds = flow.fields.filter(shown).map((field) => field.id)
  const continueIssues = stepIssues(flow.id, form, balance, app.limit, app.payees, wstep, reviewAt, visibleFieldIds)
  const hiddenIssues = hiddenBlockingIssues(flow.id, form, balance, app.limit, app.payees, wstep, reviewAt, visibleFieldIds)
  const fieldErrorText = (fieldId: string) => {
    if (!touched.has(fieldId) && !continueTried) return ''
    const issue = issues.find((item) => item.field === fieldId) || continueIssues.find((item) => item.field === fieldId)
    return issue ? describe(issue) : ''
  }
  const touchField = (fieldId: string) => {
    setTouched((prev) => new Set(prev).add(fieldId))
    const found = validateForm(flow.id, form, balance, app.payees, app.limit).filter((issue) => issue.field === fieldId)
    if (found.length) setIssues((current) => [...current.filter((issue) => issue.field !== fieldId), ...found])
  }
  const continueHintKey =
    flow.id === 'transfer' && wstep === 0 ? 'flows.continueHintTransfer'
    : flow.id === 'paynow' && wstep === 0 ? 'flows.continueHintPaynow'
    : (flow.id === 'paynow' || flow.id === 'transfer' || flow.id === 'overseas') && wstep >= 1 && wstep < reviewAt ? 'flows.continueHintAmount'
    : 'flows.continueHintDefault'
  const engaged = continueTried || [...touched].some((id) => (stepIds || []).includes(id))
  const prefilled = highlights.length > 0
  const showHiddenErrors = hiddenIssues.length > 0 && (continueTried || prefilled)
  const blockContinue = continueIssues.length > 0 || showHiddenErrors
  const showContinueMessage = continueIssues.length > 0 || hiddenIssues.length > 0
  const sendAmount = Number(String(form.amount || '').replace(/,/g, '')) || 0
  const received = fx ? Math.max(0, sendAmount - fx.fee) * fx.perSgd : 0
  // PayNow payee as in the OCBC app: saved contact name on top, then "+65 8123 4567 • SITI AXXXXX".
  const pn = (() => {
    const proxy = form.proxy || 'mobile'
    const digits = String(form.to || '').replace(/\D/g, '').replace(/^65(?=\d{8}$)/, '')
    const registered = paynowHit?.status === 'ok' ? paynowHit.name || '' : ''
    const saved = proxy === 'mobile'
      ? app.payees.find((item) => item.key === `paynow:${digits}`)?.label || PAYNOW_CONTACTS.find((contact) => contact.mobile === digits)?.name || ''
      : ''
    const number = proxy === 'mobile' && digits.length === 8 ? `+65 ${digits.slice(0, 4)} ${digits.slice(4)}` : maskProxy(form.to || '', proxy)
    const top = saved || registered || number
    const sub = top === number ? '' : saved && registered ? `${number} • ${registered}` : number
    return { top, sub }
  })()
  const fromAccount = app.accounts.find((account) => account.id === form.from)
  const amountNumber = Number(String(form.amount || '').replace(/,/g, ''))
  const paynowAmountText = Number.isFinite(amountNumber) && amountNumber > 0 ? formatDraftAmount(amountNumber.toFixed(2)) : ''
  // Split "Daily limit remaining: {amount}" so only the amount is the underlined link (works for any word order).
  const limitParts = t('look.limitLeft', { amount: '\u0001' }).split('\u0001')
  // Success screen text, shared by the screen itself and the Share link.
  const paidTitle = practice ? t('practice.doneTitle') : flow.id === 'goal' ? t('success.goalAdded', { amount: formatMoney(Number(form.monthly) || Number(form.target) || 0), name: form.name || 'Holiday' }) : t('look.paid', { amount: formatMoney(sendAmount) })
  const paidToLabel = t(flow.id === 'goal' ? 'success.payee' : 'look.to')
  const paidTo = flow.id === 'paynow' ? pn.top : displayPayee || form.name || title
  const paidWhen = form.when === 'later' && form.laterDate ? form.laterDate : new Intl.DateTimeFormat(app.prefs.language.startsWith('zh') ? 'zh-CN' : 'en-SG', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date())
  const sharePayment = () => {
    const text = [paidTitle, `${paidToLabel}: ${paidTo}${flow.id === 'paynow' && pn.sub ? ` (${pn.sub})` : ''}`, `${t('success.when')}: ${paidWhen}`, t('look.transactionId', { id: ref })].join('\n')
    if (typeof navigator.share === 'function') {
      void navigator.share({ title: t('success.demo'), text }).catch(() => {})
      return
    }
    void navigator.clipboard?.writeText(text).then(() => setShareNote(t('look.shareCopied'))).catch(() => {})
  }
  // Review layout for the other payment flows (transfer, overseas, bills, scan, top-up), same look as PayNow's review.
  // Used on the Transfer/Overseas summary step and on the slide-to-pay screen. Display only: values come from the form.
  const payField = flow.fields.find((field) => field.id === flow.payeeField)
  const payTop = flow.id === 'topup' ? lookedUp || maskProxy(form.to || '') : payField ? display(payField, form[payField.id] || '', t) : ''
  const paySub = flow.fields
    .filter((field) => ['bank', 'country', 'swift', 'account', 'ref'].includes(field.id) || (flow.id === 'topup' && field.id === 'to' && !!lookedUp))
    .filter((field) => !(field.id === 'swift' && fx?.account === 'iban'))
    .map((field) => field.id === 'to' ? maskProxy(form.to || '') : field.id === 'ref' ? `${shortLabel(field, t)} ${form.ref || ''}` : display(field, form[field.id] || '', t))
    .filter((text) => text.trim())
    .join(' • ')
  const payDetails = flow.fields.filter((field) => {
    if (['amount', 'from', 'lock', 'to', 'bank', 'country', 'swift', 'account', 'ref', flow.payeeField].includes(field.id)) return false
    if (field.id === 'laterDate') return form.when === 'later'
    if (field.id === 'when') return form.when !== 'later'
    return true
  })
  const otherReview = flow.kind === 'payment' && flow.id !== 'paynow' ? (
    <div className="space-y-5">
      <div>
        <h2 className="text-[1rem] font-normal text-[var(--muted)]">{t('look.reviewPaymentOf')}</h2>
        <Amount value={sendAmount} size="2.25rem" />
      </div>
      <div className="border-l-4 border-[var(--accent)] pl-4">
        <p className="text-[0.95rem] text-[var(--muted)]">{t('look.payTo')}</p>
        <p className="text-[1.25rem] font-bold leading-snug">{payTop}</p>
        {paySub && <p className="text-[0.95rem] text-[var(--muted)]">{paySub}</p>}
      </div>
      <div>
        <p className="text-[0.95rem] text-[var(--muted)]">{t('look.from')}</p>
        <p className="text-[1.1rem] font-bold">{t(fromAccount?.nameKey || 'accounts.a360')}</p>
        {fromAccount?.number && <p className="text-[0.95rem]">{fromAccount.number}</p>}
      </div>
      {(payDetails.length > 0 || fx) && (
        <dl className="space-y-3">
          {payDetails.map((field) => (
            <div key={field.id}>
              <dt className="text-[0.95rem] text-[var(--muted)]">{shortLabel(field, t)}</dt>
              <dd className="money text-[1.05rem] font-bold">{display(field, form[field.id] || '', t)}</dd>
            </div>
          ))}
          {fx && (
            <>
              <div><dt className="text-[0.95rem] text-[var(--muted)]">{t('success.rate')}</dt><dd className="money text-[1.05rem] font-bold">{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</dd></div>
              <div><dt className="text-[0.95rem] text-[var(--muted)]">{t('success.fee')}</dt><dd className="money text-[1.05rem] font-bold">{formatMoney(fx.fee)}</dd></div>
              <div><dt className="text-[0.95rem] text-[var(--muted)]">{t('success.received')}</dt><dd className="money text-[1.05rem] font-bold">{t(fx.currencyKey)} {received.toFixed(2)}</dd></div>
            </>
          )}
        </dl>
      )}
      {fx && <p className="text-[0.85rem] text-[var(--muted)]">{t('ai.sampleRate')}</p>}
      <p className="text-[0.75rem] leading-snug text-[var(--muted)]">{t('look.checkDetails')}</p>
    </div>
  ) : null

  const describe = (issue: Issue) => {
    const field = flow.fields.find((item) => item.id === issue.field)
    const params: Record<string, string | number> = { ...(issue.params || {}) }
    if (field && params.field) params.field = t(field.label)
    if (issue.code === 'insufficient') params.available = formatMoney(Number(issue.params?.available ?? balance))
    if (issue.code === 'daily_limit') params.limit = formatMoney(Number(issue.params?.limit ?? app.limit))
    return t(`errors.${issue.code}`, params)
  }
  // Message above Next. Errors already shown under their own field on this screen aren't repeated here.
  const continueText = engaged || showHiddenErrors
    ? [...continueIssues, ...(showHiddenErrors ? hiddenIssues : [])]
      .filter((issue) => !(visibleFieldIds.includes(issue.field) && fieldErrorText(issue.field)))
      .map((issue) => describe(issue)).join(' ')
    : t(continueHintKey)

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
    setTouched((prev) => new Set(prev).add(id))
    setForm((prev) => {
      const next = { ...prev, [id]: value }
      setIssues((current) => {
        if (!current.some((issue) => issue.field === id)) return current
        const still = validateForm(flow.id, next, balance, app.payees, app.limit).filter((issue) => issue.field === id)
        const nextIssues = [...current.filter((issue) => issue.field !== id), ...still]
        if (!nextIssues.length) app.setAnnounce('')
        return nextIssues
      })
      return next
    })
    app.setScreen(flow.id, id)
  }

  const submit = () => {
    const found = validateForm(flow.id, form, balance, app.payees, app.limit)
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
    <Page
      title={title}
      back
      tone={flow.id === 'paynow' && stage === 'form' && wstep === 0 && (!practice || guideOn) ? 'pink' : 'plain'}
      // PayNow header back arrow: review -> amount screen (same as the in-page Back button); amount -> contacts list.
      // Practice mode has no contacts screen, so its amount screen keeps the normal back. Guides control navigation themselves.
      // Local transfer / Overseas header back arrow: review -> summary step, then one wizard step back at a time (same as the in-page Back).
      onBack={flow.id === 'paynow' && !guideOn && (stage === 'review' || (stage === 'form' && wstep === 1 && !practice))
        ? () => { setIssues([]); setStage('form'); setWstep(stage === 'review' ? 1 : 0); document.getElementById('main')?.scrollTo(0, 0) }
        : (flow.id === 'transfer' || flow.id === 'overseas') && !guideOn && (stage === 'review' || (stage === 'form' && wstep > 0))
          ? () => { setIssues([]); if (stage === 'review') setStage('form'); else setWstep((value) => Math.max(0, value - 1)); document.getElementById('main')?.scrollTo(0, 0) }
          : undefined}
    >
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
          <p data-guide="limit-current" className="rounded-lg bg-[var(--beige)] p-4 font-semibold">{t('flows.currentLimit', { amount: formatMoney(app.limit) })}</p>
        )}
        {flow.id === 'scan' && stage === 'form' && (
          <div data-guide="scan-frame" className="flex flex-col items-center gap-3 rounded-lg bg-[var(--beige)] p-4">
            <div aria-hidden className="grid h-28 w-28 grid-cols-5 gap-1 bg-white p-2">
              {Array.from({ length: 25 }, (_, i) => (
                <span key={i} className={i % 3 === 0 ? 'bg-black' : 'bg-transparent'} />
              ))}
            </div>
            <p>{t('flows.scanHint')}</p>
            <button type="button" className="ocbc-btn" onClick={() => setForm((prev) => ({ ...prev, merchant: 'Hawker Stall 12' }))}>
              {t('flows.scanButton')}
            </button>
          </div>
        )}
        {stage === 'form' && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              setContinueTried(true)
              if (flow.id === 'paynow' && wstep === 1) {
                // Single review: validate everything, run the scam check, then go straight to "Review payment of".
                const found = validateForm(flow.id, form, balance, app.payees, app.limit)
                setIssues(found)
                found.forEach((issue) => app.log('error_shown', { code: issue.code, flowId: flow.id }))
                if (found.length) {
                  if (app.prefs.readAloud) app.setAnnounce(describe(found[0]))
                  focusIssues(found)
                  return
                }
                const amount = Number(String(form[flow.amountField || ''] || '').replace(/,/g, ''))
                if (openScamCheck(amount, () => setStage('review'))) return
                setStage('review')
                return
              }
              if (reviewAt >= 0 && wstep < reviewAt) {
                const ids = new Set(stepIds || [])
                const found = validateForm(flow.id, form, balance, app.payees, app.limit).filter((issue) => ids.has(issue.field))
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
                const found = validateForm(flow.id, form, balance, app.payees, app.limit)
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
              <section className="space-y-1 rounded-lg bg-[var(--beige)] p-4" aria-label={t('fx.sample')}>
                <p className="font-semibold">{t('fx.sample')}</p>
                <p>{t('fx.currency')}: {t(fx.currencyKey)}</p>
                <p>{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</p>
                <p>{t('fx.fee', { fee: formatMoney(fx.fee) })}</p>
                <p>{t('fx.received', { amount: `${t(fx.currencyKey)} ${received.toFixed(2)}` })}</p>
                <p className="text-[var(--muted)]">{t('fx.accountHint', { hint: t(`fx.hint.${fx.account}`) })}</p>
              </section>
            )}
            {flow.id === 'overseas' && app.payees.length > 0 && (
              <section>
                <p className="text-[1.15rem] font-bold">{t('savedPayees')}</p>
                {app.payees.map((payee) => (
                  <button
                    key={payee.id}
                    type="button"
                    className="flex min-h-12 w-full items-center gap-3 border-b border-[var(--line)] py-3 text-left"
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
                    <Avatar name={payee.label} size="2.75rem" />
                    <span className="min-w-0 flex-1 text-[1.05rem]">{payee.label}</span>
                    <ChevronRight aria-hidden size={20} strokeWidth={1.5} className="shrink-0 text-[var(--muted)]" />
                  </button>
                ))}
              </section>
            )}
            {issues.length > 1 && (
              <div ref={alertRef} tabIndex={-1} role="alert" className="field-error flex-col items-stretch">
                <p className="flex items-center gap-2 font-bold">
                  <CircleAlert aria-hidden size={18} /> {t('errors.count', { n: issues.length })}
                </p>
                {/* The individual errors show under each field, so they aren't listed again here. */}
                <div className="mt-2 flex gap-2">
                  {issues.some((issue) => issue.code === 'insufficient') && (
                    <button type="button" className="min-h-11 flex-1 rounded-xl border border-[var(--danger)] px-2 font-semibold" onClick={() => changeField('amount', Math.max(0, balance).toFixed(2))}>{t('errors.useMax')}</button>
                  )}
                  <button type="button" className="min-h-11 flex-1 rounded-xl border border-[var(--danger)] px-2 font-semibold" onClick={() => app.openHelp('staff')}>{t('getHelp')}</button>
                </div>
                {app.prefs.readAloud && <Speakable text={issues.map(describe).join('. ')} auto hideText />}
              </div>
            )}
            {reviewAt >= 0 && wstep === reviewAt && flow.id !== 'paynow' && <section>{otherReview}</section>}
            {flow.id === 'paynow' && directory && wstep === 0 && (!practice || guideOn) && (
              <section className="space-y-3">
                <div className={`-mx-4 bg-[var(--pink-soft)] px-4 pb-4 pt-1 ${practice || demo ? '' : '-mt-4'}`}>
                <div role="tablist" data-guide="paynow-id-tabs" aria-label={t('flows.proxyType')} className="grid grid-cols-3 gap-2" onKeyDown={(event) => {
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
                  {(['mobile', 'nric', 'uen'] as const).map((id) => {
                    const on = (form.proxy || 'mobile') === id
                    const Icon = id === 'mobile' ? Smartphone : id === 'nric' ? IdCard : Building2
                    return (
                      <button key={id} type="button" role="tab" aria-selected={on} className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.9rem] leading-tight ${on ? 'bg-[var(--card)] font-semibold ring-1 ring-[var(--line)]' : 'font-normal'}`} onClick={() => setForm((prev) => ({ ...prev, proxy: id, to: '' }))}>
                        <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-[var(--card)] text-[var(--link)]"><Icon size={20} strokeWidth={1.5} /></span>
                        {t(id === 'mobile' ? 'flows.mobile' : id === 'nric' ? 'look.nric' : 'look.uen')}
                      </button>
                    )
                  })}
                </div>
                </div>
                <div className="relative">
                  <Search aria-hidden size={20} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input id="paynow-mobile" data-guide="paynow-to" inputMode={form.proxy === 'mobile' || !form.proxy ? 'tel' : 'text'} className="min-h-12 w-full rounded-lg bg-[var(--soft)] py-2 pl-10 pr-3 text-[1rem] text-[var(--text)] placeholder:text-[var(--muted)]" placeholder={t(form.proxy === 'nric' ? 'look.nricPh' : form.proxy === 'uen' ? 'look.uenPh' : 'look.mobilePh')} aria-label={t('look.searchPayee')} value={form.to || ''} onChange={(event) => setForm((prev) => ({ ...prev, to: event.target.value }))} />
                </div>
                {(form.proxy || 'mobile') === 'mobile' && (
                <>
                <div className="-mx-4 grid grid-cols-2 border-b border-[var(--line)] text-center text-[1rem]">
                  <span className="border-b-2 border-[var(--accent)] pb-2 font-semibold">{t('look.recentTab')}</span>
                  <span className="pb-2 text-[var(--muted)]">{t('look.contactsTab')}</span>
                </div>
                {(app.payees.some((payee) => payee.name === 'Tan Wei Ming') ? PAYNOW_CONTACTS.filter((contact) => contact.name === 'Tan Wei Ming') : PAYNOW_CONTACTS.filter((contact) => contact.name !== 'Tan Wei Ming')).map((contact) => (
                  <button key={contact.mobile} type="button" className="flex min-h-11 w-full items-center gap-3 border-b border-[var(--line)] py-3 text-left" onClick={() => { setPayeeLabel(contact.name); setForm((prev) => ({ ...prev, proxy: 'mobile', to: contact.mobile })); setWstep(1) }}>
                    <Avatar name={contact.name} size="2.75rem" />
                    <span className="min-w-0">
                      <span className="block text-[1.05rem]">{contact.name}</span>
                      <span className="block text-[0.95rem] text-[var(--muted)]">+65 {contact.mobile.slice(0, 4)} {contact.mobile.slice(4)}</span>
                    </span>
                  </button>
                ))}
                <button type="button" className="min-h-11 text-[1rem] text-[var(--link)] underline" onClick={() => document.getElementById('paynow-mobile')?.focus()}>{t('look.enterMobile')}</button>
                </>
                )}
                {lookupPaynow(form.to || '', form.proxy || 'mobile').status === 'ok' && (
                  <button type="button" data-guide="paynow-name" className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-[var(--line)] px-3 text-left font-bold" onClick={() => { setPayeeLabel(payeeName(form.to) || ''); setWstep(1) }}>
                    <span className="min-w-0 flex-1">{lookupPaynow(form.to || '', form.proxy || 'mobile').name}</span>
                    <ChevronRight aria-hidden size={20} strokeWidth={1.5} className="shrink-0" />
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
              <fieldset key={group.guide} className="space-y-3 border-b border-[var(--line)] pb-4">
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
                    options={field.id === 'card' ? app.cards.map((card) => ({ value: card.id, label: card.nameKey })) : field.type === 'account' ? app.accounts.filter((account) => account.kind === 'deposit').map((account) => ({ value: account.id, label: account.nameKey })) : undefined}
                    highlight={highlights.includes(field.id)}
                    cents={flow.kind === 'payment' && field.id === 'amount'}
                    error={fieldErrorText(field.id)}
                    onBlur={() => touchField(field.id)}
                    balanceHint={field.id === 'from' ? t('flows.available', { amount: formatMoney(balance) }) : ''}
                    onChange={(value) => {
                      if (field.id === 'country' && flow.id === 'overseas') {
                        const sample = overseasSample(value)
                        const current = overseasSample(form.country || 'Australia')
                        setForm((prev) => ({
                          ...prev,
                          country: value,
                          account: !prev.account || prev.account === current.account ? sample.account : prev.account,
                          swift: !prev.swift || prev.swift === current.swift ? sample.swift : prev.swift,
                        }))
                        return
                      }
                      changeField(field.id, value)
                    }}
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
              <label data-guide="card-toggle" className="flex min-h-tap items-center justify-between border-b border-[var(--line)] py-3">
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
              <section className="space-y-4">
                <div>
                  <p className="text-[0.95rem] text-[var(--muted)]">{t('look.payTo')}</p>
                  <p className="text-[1.6rem] font-bold leading-tight">{pn.top}</p>
                  {pn.sub && <p className="mt-1 text-[0.95rem] text-[var(--muted)]">{pn.sub}</p>}
                </div>
                <div data-guide="pay-amount" className="flex items-baseline gap-2">
                  {/* Cents-first entry, like a bank keypad: typing 1, 2, 3 shows 0.01, 0.12, 1.23. */}
                  <input data-guide="paynow-amount" className="min-w-0 max-w-[75%] bg-transparent text-[2.25rem] font-semibold leading-tight outline-none placeholder:text-[var(--muted)] placeholder:opacity-60" style={{ width: `${Math.max(4, paynowAmountText.length) + 0.5}ch` }} inputMode="numeric" aria-label={t('amount')} placeholder="0.00" value={paynowAmountText} onFocus={(event) => { const el = event.currentTarget; window.setTimeout(() => el.setSelectionRange(el.value.length, el.value.length), 0) }} onChange={(event) => { const digits = event.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10); changeField('amount', digits ? (Number(digits) / 100).toFixed(2) : '') }} />
                  <span className="shrink-0 whitespace-nowrap text-[1rem]">SGD</span>
                </div>
                <p className="text-[1rem]">{limitParts[0]}<Link to="/flow/limit" className="text-[var(--link)] underline">{formatMoney(app.limit)}</Link>{limitParts[1]}</p>
                <div data-guide="pay-message">
                  <input data-guide="paynow-reference" className="min-h-11 max-w-full rounded-full bg-[var(--slate)] px-4 text-[1rem] text-white placeholder:text-white" style={{ width: `calc(${Math.max(1, textWidth(form.reference || t('look.addMessage')))}ch + 2.25rem)` }} maxLength={35} placeholder={t('look.addMessage')} aria-label={t('look.addMessage')} value={form.reference || ''} onChange={(event) => changeField('reference', event.target.value)} />
                </div>
                <hr className="-mx-4 border-t border-[color:color-mix(in_srgb,var(--muted)_45%,transparent)]" />
                <button type="button" data-guide="pay-from" className="block min-h-11 w-full text-left" onClick={() => setFromOpen(true)}>
                  <span className="block text-[0.95rem] text-[var(--muted)]">{t('look.from')}</span>
                  <span className="block text-[1.1rem] font-bold">{t(fromAccount?.nameKey || 'accounts.a360')}</span>
                  {fromAccount?.number && <span className="block text-[0.95rem]">{fromAccount.number}</span>}
                </button>
                <button type="button" className="inline-flex min-h-11 items-center gap-2 text-[1rem] text-[var(--link)]" aria-pressed={showBal} onClick={() => setShowBal((value) => !value)}>
                  {showBal ? <EyeOff aria-hidden size={20} strokeWidth={1.5} /> : <Eye aria-hidden size={20} strokeWidth={1.5} />}
                  <span className={showBal ? 'text-[var(--text)]' : 'underline'}>{showBal ? `${t('look.available')} ${formatMoney(balance)}` : t('look.showBalance')}</span>
                </button>
                {Number(form.amount) > app.limit && <p id="pay-alert" role="alert" className="rounded-lg border border-l-4 border-[var(--danger)] bg-[var(--soft)] p-3 text-[0.95rem] font-bold text-[var(--text)]">{t('look.overLimit', { amount: formatMoney(app.limit) })} <Link to="/flow/limit" className="underline">{t('look.changeLimit')}</Link></p>}
                {Number(form.amount) > balance && Number(form.amount) <= app.limit && <p id="pay-alert" role="alert" className="rounded-lg border border-l-4 border-[var(--danger)] bg-[var(--soft)] p-3 text-[0.95rem] font-bold text-[var(--text)]">{t('look.overBalance', { amount: formatMoney(balance) })}</p>}
                {Number(form.amount) <= 0 && <p id="pay-alert" className="text-[0.9rem] text-[var(--muted)]">{t('look.enterAmount')}</p>}
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
              <button type="button" className="text-sm font-semibold text-[var(--link)] underline" onClick={() => { setIssues([]); setWstep((value) => value - 1) }}>{t('back')}</button>
            )}
            {!(flow.id === 'paynow' && directory && wstep === 0 && (!practice || guideOn)) && (
            <>
            {/* Errors left over (e.g. from a field on another step) use the same red box as the field errors. PayNow keeps its own amount-screen style. */}
            {showContinueMessage && continueText && (engaged || showHiddenErrors) && flow.id !== 'paynow' ? (
              <FieldError>{continueText}</FieldError>
            ) : showContinueMessage && continueText && (
              <p aria-live="polite" id={flow.id === 'paynow' && wstep === 1 ? 'pay-alert' : undefined} className={`text-sm font-semibold ${engaged || showHiddenErrors ? 'text-[var(--danger)]' : 'text-[var(--muted)]'}`} role={engaged || showHiddenErrors ? 'alert' : 'status'}>
                {continueText}
              </p>
            )}
            <button type="submit" data-guide={flow.id === 'paynow' && wstep === 1 ? 'pay-next' : reviewGuide(flow.id)} aria-describedby={flow.id === 'paynow' && wstep === 1 ? 'pay-alert' : undefined} className={`${flow.id === 'paynow' && wstep === 1 ? 'ocbc-btn-secondary' : 'ocbc-btn'} disabled:cursor-not-allowed`} disabled={blockContinue || (touring && !practice && reviewAt >= 0 && wstep >= reviewAt)}>
              {t('flows.submit')}
            </button>
            </>
            )}
            {!practice && (
              <button type="button" className="ocbc-btn-secondary" onClick={() => navigate(`/flow/${flow.id}?practice=1&tour=1`)}>
                {t('practise')}
              </button>
            )}
            {demo === 'mei' && (
              <button type="button" className="ocbc-btn-secondary" onClick={() => { app.setStaffSeed(t('demo.mei')); app.openHelp('staff') }}>
                {t('demo.contactStaff')}
              </button>
            )}
          </form>
        )}
        {(stage === 'review' || stage === 'processing') && (
          <section className={flow.id === 'paynow' || otherReview ? 'space-y-5' : 'space-y-4'}>
            {flow.id === 'paynow' ? (
              <>
                <div>
                  <h2 className="text-[1rem] font-normal text-[var(--muted)]">{t('look.reviewPaymentOf')}</h2>
                  <Amount value={sendAmount} size="2.25rem" />
                </div>
                <div className="border-l-4 border-[var(--accent)] pl-4">
                  <p className="text-[0.95rem] text-[var(--muted)]">{t('look.payTo')}</p>
                  <p data-guide="paynow-review-name" className="text-[1.25rem] font-bold leading-snug">{pn.top}</p>
                  {pn.sub && <p className="text-[0.95rem] text-[var(--muted)]">{pn.sub}</p>}
                  {form.reference?.trim() && (
                    <>
                      <p className="mt-3 text-[0.95rem] text-[var(--muted)]">{t('look.message')}</p>
                      <p className="text-[1rem] font-bold">{form.reference}</p>
                    </>
                  )}
                </div>
                <div>
                  <p className="text-[0.95rem] text-[var(--muted)]">{t('look.from')}</p>
                  <p className="text-[1.1rem] font-bold">{t(fromAccount?.nameKey || 'accounts.a360')}</p>
                  {fromAccount?.number && <p className="text-[0.95rem]">{fromAccount.number}</p>}
                </div>
                <p className="text-[0.75rem] leading-snug text-[var(--muted)]">{t('look.checkDetails')}</p>
              </>
            ) : otherReview || (
            <>
            <h2 className="text-[1.4rem] font-bold">{t('review')}</h2>
            <dl className="space-y-3">
            {flow.fields.filter((field) => {
              if (field.id === 'laterDate') return form.when === 'later'
              if (field.id === 'when') return form.when !== 'later'
              if (field.id === 'swift') return fx?.account !== 'iban'
              return true
            }).map((field) => (
              <div key={field.id} className="min-w-0 border-b border-[var(--line)] pb-3">
                <dt className="text-[0.95rem] text-[var(--muted)]">{field.id === 'account' && fx?.account === 'iban' ? t('flows.iban') : shortLabel(field, t)}</dt>
                <dd className="money min-w-0 text-[1.05rem] font-bold">{field.id === 'to' ? maskProxy(form[field.id] || '', form.proxy) : display(field, form[field.id] || '', t)}</dd>
              </div>
            ))}
            </dl>
            {flow.id === 'card-lost' && <p>{t('flows.lostNote')}</p>}
            </>
            )}
            {touring && !practice ? (
              <div className="space-y-2">
                {/* Shown (inert) only while the guide runs, so its "slide to pay" step has something to point at. */}
                {flow.kind === 'payment' && guideOn && (
                  <PayControl easier={app.prefs.easierTapping} disabled label={t('look.slide')} holdLabel={t('look.holdToPay')} holdingLabel={t('look.holdingToPay')} ariaLabel={`${app.prefs.easierTapping ? t('look.holdToPay') : t('look.slide')} ${formatMoney(Number(form.amount) || 0)}`} guide={reviewGuide(flow.id)} onPay={() => {}} />
                )}
                <button type="button" className="ocbc-btn" onClick={() => { stopGuide(); navigate(`/flow/${flow.id}?practice=1`) }}>{t('flows.practiseThis')}</button>
                <button type="button" className="ocbc-btn-secondary" onClick={() => { stopGuide(); navigate(`/flow/${flow.id}`, { replace: true }) }}>{t('doForReal')}</button>
              </div>
            ) : flow.kind === 'payment' ? (
              <PayControl easier={app.prefs.easierTapping} disabled={false} label={practice ? t('look.slidePractice') : t('look.slide')} holdLabel={t('look.holdToPay')} holdingLabel={t('look.holdingToPay')} ariaLabel={`${app.prefs.easierTapping ? t('look.holdToPay') : t('look.slide')} ${formatMoney(Number(form.amount) || 0)}`} guide={reviewGuide(flow.id)} onPay={() => { setOtp(''); setOtpError(''); setStage('otp') }} />
            ) : null}
            {flow.kind === 'payment' && !(touring && !practice) ? (
              <button type="button" className="min-h-11 w-full text-[0.95rem] text-[var(--link)] underline" onClick={() => setConfirmPay(true)}>{t('look.tapToPay')}</button>
            ) : (
              <button type="button" className="ocbc-btn" onClick={() => confirm()}>{t('confirm')}</button>
            )}
            <button type="button" className="tap w-full" onClick={() => { setStage('form'); if (flow.id === 'paynow') setWstep(1) }}>{t('back')}</button>
            {confirmPay && (
              <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
                <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-4">
                  <p className="text-lg font-bold">{t('look.payAsk', { amount: formatMoney(Number(form.amount) || 0), name: flow.id === 'paynow' ? pn.top : maskPayee(payeeLabel || form.name || form.to || '') })}</p>
                  <button type="button" className="ocbc-btn mt-3" onClick={() => { setConfirmPay(false); setOtp(''); setOtpError(''); setStage('otp') }}>{t('look.pay')}</button>
                  <button type="button" className="mt-2 min-h-11 w-full font-semibold underline" onClick={() => setConfirmPay(false)}>{t('cancel')}</button>
                </div>
              </div>
            )}
          </section>
        )}
        {stage === 'otp' && (
          <section className="space-y-4 pt-2">
            <span aria-hidden className="ocbc-icon-circle h-14 w-14 text-[var(--link)]"><KeyRound size={26} strokeWidth={1.5} /></span>
            <h2 className="text-[1.4rem] font-bold leading-tight" id="otp-title">{t('flows.otpTitle')}</h2>
            <p className="text-[0.95rem] text-[var(--muted)]">{t('flows.otpBody')}</p>
            <input id="demo-otp" aria-labelledby="otp-title" aria-invalid={otpError ? true : undefined} aria-describedby={otpError ? 'otp-error' : undefined} inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={(e) => { setOtp(e.target.value); if (/^\d{6}$/.test(e.target.value.trim())) { setOtpError(''); app.setAnnounce('') } }} className={`ocbc-field text-center text-[1.5rem] font-semibold tracking-[0.3em] ${otpError ? 'is-invalid' : ''}`} />
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
          <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/45">
            <section className="rounded-t-2xl bg-[var(--card)] px-6 pb-10 pt-3 text-center text-[var(--text)]" role="status" aria-live="polite">
              <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-[var(--line)]" />
              {/* Neutral placeholder where the real app shows an illustration. */}
              <span aria-hidden className="mx-auto mt-6 grid h-28 w-28 place-items-center rounded-full bg-[var(--soft)] text-[var(--link)]"><ArrowLeftRight size={40} strokeWidth={1.25} /></span>
              <p className="mt-6 text-[1.15rem] font-bold">{t('look.processing')}</p>
            </section>
          </div>
        )}
        {stage === 'done' && flow.id === 'card-lock' && (
          <section className="card space-y-3 p-4" role="status">
            <h2 className="text-lg font-bold text-[var(--success)]">{t('cards.debit')} •••• {app.cards.find((card) => card.id === form.card)?.last4 || '2291'} {form.lock === 'no' ? t('look.cardActive') : t('look.cardLocked')}</h2>
            <Link to="/" className="ocbc-btn">{t('backHome')}</Link>
            <Link to={`/flow/card-lock?card=${form.card || 'debit'}`} className="block min-h-11 text-center font-semibold text-[var(--link)] underline" onClick={() => { setForm((prev) => ({ ...prev, lock: prev.lock === 'no' ? 'yes' : 'no' })); setStage('form') }}>{form.lock === 'no' ? t('look.lockCard') : t('look.unlockCard')}</Link>
          </section>
        )}
        {stage === 'done' && flow.id !== 'card-lock' && (
          <section role="status">
            {/* Neutral placeholder where the real app shows an illustration. */}
            <div aria-hidden className={`relative -mx-4 h-36 overflow-hidden ${practice || demo || flow.id === 'limit' ? '' : '-mt-4'}`}>
              <span className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[var(--soft)]" />
              <span className="absolute right-10 top-8 grid h-20 w-20 place-items-center rounded-full bg-[var(--card)] text-[var(--ok)]"><CircleCheck size={48} strokeWidth={1.5} /></span>
            </div>
            <div className="mt-2 flex items-start gap-2">
              <h2 className="min-w-0 flex-1 text-[1.75rem] font-bold leading-tight">{paidTitle}</h2>
              {/* Fixed-width wrapper: Speakable is full-width by default and was squeezing the heading onto two lines. */}
              <span className="w-11 shrink-0">
                <Speakable text={practice ? t('practice.done') : t('success.summarySpoken', { amount: formatMoney(sendAmount), name: flow.id === 'paynow' ? pn.top : displayPayee || title, ref })} auto={app.prefs.readAloud} hideText />
              </span>
            </div>
            <dl className="mt-6 space-y-5">
              {practice && flow.id !== 'goal' && <div><dt className="text-[0.95rem] text-[var(--muted)]">{t('amount')}</dt><dd className="money text-[1.1rem] font-bold">{formatMoney(sendAmount)}</dd></div>}
              <div>
                <dt className="flex items-center justify-between gap-3 text-[0.95rem] text-[var(--muted)]">
                  <span>{paidToLabel}</span>
                  <button type="button" className="-my-3 min-h-11 px-1 text-[1rem] text-[var(--link)] underline" onClick={sharePayment}>{t('ai.chatShare')}</button>
                </dt>
                <dd className="min-w-0 text-[1.1rem] font-bold">{paidTo}</dd>
                {flow.id === 'paynow' && pn.sub && <dd className="text-[0.95rem] text-[var(--muted)]">{pn.sub}</dd>}
              </div>
              <div>
                <dt className="text-[0.95rem] text-[var(--muted)]">{t('success.when')}</dt>
                <dd className="money text-[1.1rem] font-bold">{paidWhen}</dd>
              </div>
              {fx && (
                <>
                  <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.fee')}</dt><dd className="money font-semibold">{formatMoney(fx.fee)}</dd></div>
                  <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.rate')}</dt><dd className="money font-semibold">{t('fx.rate', { currency: t(fx.currencyKey), rate: fx.perSgd.toFixed(2) })}</dd></div>
                  <div className={app.prefs.textSize >= 20 ? 'flex flex-col' : 'flex justify-between gap-3'}><dt className="text-[var(--muted)]">{t('success.received')}</dt><dd className="money font-semibold">{t(fx.currencyKey)} {received.toFixed(2)}</dd></div>
                </>
              )}
            </dl>
            {shareNote && <p role="status" className="mt-2 text-[0.85rem] text-[var(--muted)]">{shareNote}</p>}
            <Link to={`/txn/${ref || 'latest'}`} className="mt-4 inline-flex min-h-11 items-center text-[1rem] text-[var(--link)] underline">{t('look.seeTxn')}</Link>
            {flow.id === 'card-lost' && (
              <div className="status-danger mt-4 rounded-xl bg-[var(--soft)] p-3">
                <p className="font-semibold">{t('staff.hotline')}</p>
                <p>{t('staff.hotlineBody')}</p>
              </div>
            )}
            <div className="mt-10 space-y-3">
              <p className="text-[0.85rem] text-[var(--muted)]">{t('look.transactionId', { id: ref })}</p>
              {practice && (
                <button type="button" className="ocbc-btn" onClick={() => navigate(`/flow/${flow.id}`)}>
                  {t('doForReal')}
                </button>
              )}
              <Link to="/pay" className={practice ? 'ocbc-btn-secondary' : 'ocbc-btn'}>{t('look.goTransfers')}</Link>
              <Link to="/" className="ocbc-btn-secondary">{t('look.backToHome')}</Link>
            </div>
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
  { name: 'Tan Wei Ming', mobile: '98765432' },
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

function shortLabel(field: FlowField, t: (key: string) => string) {
  if (field.id === 'account') return t('flows.accountShort')
  if (field.id === 'name') return t('flows.nameShort')
  if (field.id === 'from') return t('flows.fromShort')
  return t(field.label)
}

// Rough text width in `ch` so the message pill hugs its text; wide (CJK) characters count double.
function textWidth(text: string) {
  return Array.from(text).reduce((sum, char) => sum + (/[⺀-￯]/.test(char) ? 2 : 1), 0)
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

function PayControl({
  easier,
  label,
  holdLabel,
  holdingLabel,
  ariaLabel,
  guide,
  onPay,
  disabled,
}: {
  easier: boolean
  label: string
  holdLabel: string
  holdingLabel: string
  ariaLabel: string
  guide?: string
  onPay: () => void
  disabled?: boolean
}) {
  if (easier) return <PayHold label={holdLabel} holdingLabel={holdingLabel} ariaLabel={ariaLabel} guide={guide} onPay={onPay} disabled={disabled} />
  return <PaySlider label={label} ariaLabel={ariaLabel} guide={guide} onPay={onPay} disabled={disabled} />
}

function PayHold({
  label,
  holdingLabel,
  ariaLabel,
  guide,
  onPay,
  disabled,
}: {
  label: string
  holdingLabel: string
  ariaLabel: string
  guide?: string
  onPay: () => void
  disabled?: boolean
}) {
  const [progress, setProgress] = useState(0)
  const startRef = useRef<number | null>(null)
  const frameRef = useRef(0)
  const doneRef = useRef(false)
  const keyHold = useRef(false)

  const clear = () => {
    window.cancelAnimationFrame(frameRef.current)
    startRef.current = null
  }

  const tick = (now: number) => {
    if (startRef.current == null || doneRef.current) return
    const next = Math.min(1, (now - startRef.current) / 1500)
    setProgress(next)
    if (next >= 1) {
      doneRef.current = true
      clear()
      onPay()
      return
    }
    frameRef.current = window.requestAnimationFrame(tick)
  }

  const start = () => {
    if (disabled || doneRef.current || startRef.current != null) return
    startRef.current = performance.now()
    setProgress(0.02)
    frameRef.current = window.requestAnimationFrame(tick)
  }

  const cancel = () => {
    if (doneRef.current) return
    clear()
    setProgress(0)
  }

  return (
    <button
      type="button"
      data-guide={guide}
      data-pay-review=""
      data-hold-pay=""
      disabled={disabled}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className={`relative flex h-14 w-full items-center justify-center overflow-hidden rounded-full bg-[var(--slate)] px-4 text-[1.05rem] font-semibold text-white ${disabled ? 'opacity-60' : ''}`}
      onPointerDown={(event) => {
        if (disabled) return
        event.currentTarget.setPointerCapture(event.pointerId)
        start()
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onKeyDown={(event) => {
        if (disabled) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (event.key === ' ' && event.repeat) return
          keyHold.current = event.key === ' '
          start()
        }
        if (event.key === 'Escape') cancel()
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' && keyHold.current && !doneRef.current) {
          keyHold.current = false
          cancel()
        }
      }}
      onBlur={cancel}
    >
      <span className="pointer-events-none absolute inset-y-0 left-0" style={{ width: `${Math.round(progress * 100)}%`, background: "var(--accent)" }} />
      <span className="relative z-[1]">{progress > 0 && progress < 1 ? holdingLabel : label}</span>
    </button>
  )
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
      className={`relative h-14 touch-none overflow-hidden rounded-full bg-[var(--slate)] text-white ${disabled ? 'opacity-60' : ''}`}
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
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-[1.05rem] font-semibold">{label}</span>
      <span className="absolute top-1 grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--slate)]" style={{ left: `calc(${ratio} * (100% - 56px) + 4px)` }}><ChevronsRight size={24} strokeWidth={1.5} /></span>
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
  cents,
  onBlur,
}: {
  field: FlowField
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  t: (key: string) => string
  label?: string
  hint?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  error?: string
  balanceHint?: string
  highlight?: boolean
  cents?: boolean
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
  const centsNumber = Number(String(value || '').replace(/,/g, ''))
  const centsText = cents && Number.isFinite(centsNumber) && centsNumber > 0 ? formatDraftAmount(centsNumber.toFixed(2)) : ''
  return (
    <label className="block min-w-0" htmlFor={id} data-guide={field.guide}>
      <span className="mb-1 block text-[0.95rem] text-[var(--muted)]">
        {label || t(field.label)} {field.placeholder === 'optional' && <span className="font-normal text-[var(--muted)]">({t('optional')})</span>}
      </span>
      {hint && <span className="mb-1 block text-[0.85rem] font-normal text-[var(--muted)]">{hint}</span>}
      {cents ? (
        // Same cents-first entry as PayNow: typing 1, 2, 3 shows 0.01, 0.12, 1.23. Stored as "1.23", like before.
        <span className="flex items-baseline gap-2">
          <input
            id={id}
            value={centsText}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0.00"
            aria-invalid={invalid}
            aria-describedby={errorId}
            onFocus={(event) => { const el = event.currentTarget; window.setTimeout(() => el.setSelectionRange(el.value.length, el.value.length), 0) }}
            onChange={(event) => { const digits = event.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10); onChange(digits ? (Number(digits) / 100).toFixed(2) : '') }}
            onBlur={onBlur}
            className={`min-w-0 max-w-[75%] rounded-md bg-transparent text-[2.25rem] font-semibold leading-tight outline-none placeholder:text-[var(--muted)] placeholder:opacity-60 ${highlight ? 'ocbc-filled' : ''}`}
            style={{ width: `${Math.max(4, centsText.length) + 0.5}ch` }}
          />
          <span className="shrink-0 whitespace-nowrap text-[1rem]">SGD</span>
        </span>
      ) : field.type === 'select' || field.type === 'account' ? (
        <select id={id} value={value} aria-invalid={invalid} aria-describedby={errorId} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className={`ocbc-field ${error ? 'is-invalid' : ''} ${highlight ? 'ocbc-filled' : ''}`}>
          {(options || field.options)?.map((option) => (
            <option key={option.value} value={option.value}>{t(option.label)}</option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          value={value}
          // "Later" date: type digits only, the dashes are added for you (20261225 -> 2026-12-25).
          inputMode={field.id === 'laterDate' ? 'numeric' : field.inputMode}
          maxLength={field.id === 'laterDate' ? 10 : undefined}
          autoComplete="off"
          placeholder={placeholder || (field.placeholder ? t(field.placeholder) : undefined)}
          aria-invalid={invalid}
          aria-describedby={errorId}
          onChange={(e) => {
            if (field.id !== 'laterDate') return onChange(e.target.value)
            const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
            onChange(`${digits.slice(0, 4)}${digits.length > 4 ? `-${digits.slice(4, 6)}` : ''}${digits.length > 6 ? `-${digits.slice(6)}` : ''}`)
          }}
          onBlur={onBlur}
          className={`ocbc-field ${error ? 'is-invalid' : ''} ${highlight ? 'ocbc-filled' : ''} ${field.type === 'amount' ? 'text-center text-[1.75rem] font-semibold' : ''}`}
        />
      )}
      {balanceHint && <span className="mt-1 block text-sm text-[var(--muted)]">{balanceHint}</span>}
      <FieldError id={errorId}>{error}</FieldError>
    </label>
  )
}
