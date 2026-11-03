import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '@/context/AppContext'
import { Speakable } from '@/components/Speakable'
import { translate } from '@/i18n'
import { formatSGD } from '@/lib/format'
import { setScamSheetOpen } from '@/lib/scamCheck'
import { loadRiskConfig, type RiskLevel, type RiskReason } from '@/lib/transferRisk'

type Answer = 'yes' | 'no' | null

export function ScamHelpline({ className = '' }: { className?: string }) {
  const { prefs } = useApp()
  const label = translate(prefs.language, 'scamCheck.helpline')
  return (
    <a className={`phone-number block min-h-11 rounded-xl border border-[var(--line)] px-3 py-3 text-center font-semibold text-[var(--link)] ${className}`} href="tel:1799">
      {label}
    </a>
  )
}

export function ScamSheet({
  amount,
  name,
  level,
  reasons,
  words,
  dayTotal,
  usual,
  flowId,
  onCancel,
  onContinue,
  onClose,
}: {
  amount: number
  name: string
  level: RiskLevel
  reasons: RiskReason[]
  words: string[]
  dayTotal: number
  usual: number
  flowId: string
  onCancel: (answers: string) => void
  onContinue: (answers: string) => void
  onClose: () => void
}) {
  const app = useApp()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([null, null, null])
  const [left, setLeft] = useState(loadRiskConfig().coolingHighSeconds)
  const flagged = answers.some((item) => item === 'yes')
  const hold = level === 'high' || flagged
  const answerText = answers.map((item) => item || 'blank').join(',')
  const money = formatSGD(amount)
  const title = t(level === 'high' ? 'risk.titleHigh' : 'risk.titleCheck')
  const reasonLines = reasons.map((reason) => {
    if (reason === 'new-payee-amount') return t('risk.reason.newPayee')
    if (reason === 'large-amount') return t('risk.reason.large', { amount: formatSGD(loadRiskConfig().largeAmount) })
    if (reason === 'new-payee-24h-total') return t('risk.reason.day', { amount: formatSGD(dayTotal) })
    if (reason === 'overseas-new-payee') return t('risk.reason.overseas')
    if (reason === 'scam-words') return t('risk.reason.words', { word: words[0] || '' })
    return t('risk.reason.unusual', { usual: formatSGD(usual) })
  })
  const spoken = [title, ...reasonLines, t('scamCheck.q1'), t('scamCheck.q2'), t('scamCheck.q3'), hold ? t('scamCheck.warning') : ''].filter(Boolean).join(' ')

  useEffect(() => {
    setHost(document.getElementById('customer-root'))
    setScamSheetOpen(true)
    const main = document.getElementById('main')
    const previous = main?.style.overflow ?? ''
    if (main) main.style.overflow = 'hidden'
    return () => {
      setScamSheetOpen(false)
      if (main) main.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    if (!hold) return
    setLeft(loadRiskConfig().coolingHighSeconds)
    const timer = window.setInterval(() => {
      setLeft((value) => (value <= 1 ? 0 : value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [hold])

  const choose = (slot: number, value: Answer) => {
    setAnswers((prev) => prev.map((item, index) => (index === slot ? value : item)))
  }

  const talk = () => {
    const summary = `Possible scam. ${money} to ${name}. ${reasonLines.join(' ')}`
    const request = app.addRequest({
      summary,
      summaryEn: summary,
      task: flowId,
      step: 'before review',
      language: app.prefs.language,
      method: 'message',
      time: '',
      contact: '',
      urgent: true,
      customerName: app.profile?.name || '',
      needs: 'Possible scam',
      transcript: `Ollie scam check. ${summary} Answers: ${answerText}.`,
    })
    app.log('scam_check', { trigger: reasons.join(','), level, reasons: reasons.join(','), answers: answerText, result: 'staff', screen: flowId, amount, ref: request.ref })
    app.log('staff_request', { ref: request.ref, task: 'possible-scam' })
    onClose()
  }

  if (!host) return null
  const continueLabel = hold && left > 0 ? t('scamCheck.coolingLeft', { n: left }) : t('scamCheck.continueAnyway')

  return createPortal(
    <div className="absolute inset-0 z-[70] flex items-end bg-black/60" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scam-check-title"
        className="flex max-h-[85%] w-full flex-col overflow-hidden rounded-t-2xl bg-[var(--card)] text-[var(--text)] shadow-[0_-12px_40px_rgba(0,0,0,0.35)]"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[var(--line)]" />
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-3">
          <p className="text-center text-[13px] font-semibold text-[var(--muted)]">{t('ai.header')}</p>
          <div className="mx-auto my-3 grid h-16 w-16 place-items-center rounded-full bg-[#FFF3D6] text-4xl font-bold text-[#5C3B00]" aria-hidden>!</div>
          <h2 id="scam-check-title" className="text-[1.25rem] font-bold leading-snug">{title}</h2>
          <p className="mt-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[12px] font-bold ${level === 'high' ? 'bg-[#E30613] text-white' : 'bg-[#FFF3D6] text-[#5C3B00]'}`}>
              {t(level === 'high' ? 'risk.high' : 'risk.check')}
            </span>
          </p>
          <ul className="mt-3 space-y-1 rounded-xl bg-[var(--soft)] p-3 text-[15px]">
            {reasonLines.map((line) => <li key={line}>{line}</li>)}
            <li>{t('scamCheck.amountLine', { amount: money, name })}</li>
          </ul>
          <Speakable text={spoken} auto={app.prefs.readAloud} hideText />
          {(['q1', 'q2', 'q3'] as const).map((key, slot) => (
            <div key={key} className="mt-3">
              <p className="mb-1 font-semibold">{t(`scamCheck.${key}`)}</p>
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-[var(--line)]">
                <button type="button" className={`min-h-12 border-r border-[var(--line)] px-2 font-semibold ${answers[slot] === 'yes' ? 'bg-[var(--slate)] text-white' : ''}`} aria-pressed={answers[slot] === 'yes'} onClick={() => choose(slot, 'yes')}>{t('scamCheck.yes')}</button>
                <button type="button" className={`min-h-12 px-2 font-semibold ${answers[slot] === 'no' ? 'bg-[var(--slate)] text-white' : ''}`} aria-pressed={answers[slot] === 'no'} onClick={() => choose(slot, 'no')}>{t('scamCheck.no')}</button>
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 space-y-2 border-t border-[var(--line)] bg-[var(--card)] px-4 py-3">
          {hold && <p className="font-semibold text-[var(--danger)]">{t('scamCheck.warning')}</p>}
          <button type="button" className="ocbc-btn !bg-[#E30613]" onClick={() => onCancel(answerText)}>{t('scamCheck.cancel')}</button>
          <button type="button" className="ocbc-btn-secondary disabled:opacity-50" disabled={hold && left > 0} onClick={() => onContinue(answerText)}>{continueLabel}</button>
          <a className="phone-number block py-1 text-center text-sm font-semibold text-[var(--link)] underline" href="tel:1799">{t('scamCheck.callShort')}</a>
          {hold && <button type="button" className="tap w-full rounded-lg border border-[var(--line)] bg-[var(--card)] font-semibold" onClick={talk}>{t('scamCheck.staff')}</button>}
        </div>
      </div>
    </div>,
    host,
  )
}
