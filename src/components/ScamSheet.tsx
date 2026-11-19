import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '@/context/AppContext'
import { Speakable } from '@/components/Speakable'
import { translate } from '@/i18n'
import { formatMoney } from '@/lib/format'
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
  const lang = app.prefs.language
  const t = (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([null, null, null])
  const [left, setLeft] = useState(loadRiskConfig().coolingHighSeconds)
  const [extraTime, setExtraTime] = useState(false)
  const flagged = answers.some((item) => item === 'yes')
  const hold = level === 'high' || flagged
  const answerText = answers.map((item) => item || 'blank').join(',')
  const money = formatMoney(amount, lang)
  const title = t(level === 'high' ? 'risk.titleHigh' : 'risk.titleCheck')
  const reasonLines = reasons.map((reason) => {
    if (reason === 'new-payee-amount') return t('risk.reason.newPayee')
    if (reason === 'paid-before') return t('risk.reason.paidBefore')
    if (reason === 'large-amount') return t('risk.reason.large', { amount: formatMoney(loadRiskConfig().largeAmount, lang) })
    if (reason === 'new-payee-24h-total') return t('risk.reason.day', { amount: formatMoney(dayTotal, lang) })
    if (reason === 'overseas-new-payee') return t('risk.reason.overseas')
    if (reason === 'scam-words') return t('risk.reason.words', { word: words[0] || '' })
    if (reason === 'unusual-amount') return t('risk.reason.unusualAmount', { usual: formatMoney(Math.max(usual, 100), lang) })
    if (reason === 'new-payee-large') return t('risk.reason.newPayeeLarge')
    if (reason === 'first-overseas') return t('risk.reason.firstOverseas')
    if (reason === 'burst') return t('risk.reason.burst')
    if (reason === 'odd-hour-large') return t('risk.reason.oddHourLarge')
    return t('risk.reason.unusual', { usual: formatMoney(usual, lang) })
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
    if (!hold || extraTime) return
    setLeft(loadRiskConfig().coolingHighSeconds)
    const timer = window.setInterval(() => {
      setLeft((value) => (value <= 1 ? 0 : value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [hold, extraTime])

  const choose = (slot: number, value: Answer) => {
    setAnswers((prev) => prev.map((item, index) => (index === slot ? value : item)))
  }

  const reasonEn = (reason: RiskReason) => {
    const tEn = (key: string, vars?: Record<string, string | number>) => translate('en', key, vars)
    if (reason === 'new-payee-amount') return tEn('risk.reason.newPayee')
    if (reason === 'paid-before') return tEn('risk.reason.paidBefore')
    if (reason === 'large-amount') return tEn('risk.reason.large', { amount: formatMoney(loadRiskConfig().largeAmount, 'en') })
    if (reason === 'new-payee-24h-total') return tEn('risk.reason.day', { amount: formatMoney(dayTotal, 'en') })
    if (reason === 'overseas-new-payee') return tEn('risk.reason.overseas')
    if (reason === 'scam-words') return tEn('risk.reason.words', { word: words[0] || '' })
    if (reason === 'unusual-amount') return tEn('risk.reason.unusualAmount', { usual: formatMoney(Math.max(usual, 100), 'en') })
    if (reason === 'new-payee-large') return tEn('risk.reason.newPayeeLarge')
    if (reason === 'first-overseas') return tEn('risk.reason.firstOverseas')
    if (reason === 'burst') return tEn('risk.reason.burst')
    if (reason === 'odd-hour-large') return tEn('risk.reason.oddHourLarge')
    return tEn('risk.reason.unusual', { usual: formatMoney(usual, 'en') })
  }

  const talk = () => {
    const summary = t('staff.scamSummary', { money, name, reasons: reasonLines.join(' ') })
    const summaryEn = translate('en', 'staff.scamSummary', {
      money: formatMoney(amount, 'en'),
      name,
      reasons: reasons.map((reason) => reasonEn(reason)).join(' '),
    })
    const request = app.addRequest({
      summary,
      summaryEn,
      task: flowId,
      step: 'before review',
      language: lang,
      method: 'message',
      time: '',
      contact: '',
      urgent: true,
      customerName: app.profile?.name || '',
      needs: t('staff.needs.scam'),
      transcript: t('staff.transcript.scamCheck', { summary, answers: answerText }),
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
          <p className="text-center text-[0.8rem] font-semibold text-[var(--muted)]">{t('ai.header')}</p>
          <div className="mx-auto my-3 grid h-16 w-16 place-items-center rounded-full bg-[var(--soft)] text-4xl font-bold text-[var(--warn)]" aria-hidden>!</div>
          <h2 id="scam-check-title" className="text-[1.25rem] font-bold leading-snug">{title}</h2>
          <p className="mt-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.75rem] font-bold ${level === 'high' ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-[var(--soft)] text-[var(--warn)]'}`}>
              {t(level === 'high' ? 'risk.high' : 'risk.check')}
            </span>
          </p>
          <ul className="mt-3 space-y-1 rounded-lg bg-[var(--beige)] p-3 text-[0.95rem]">
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
          {hold && left > 0 && !extraTime && (
            <button
              type="button"
              className="ocbc-btn-secondary"
              onClick={() => {
                setExtraTime(true)
                setLeft(0)
              }}
            >
              {t('scamCheck.needMoreTime')}
            </button>
          )}
          <button type="button" className="ocbc-btn" disabled={hold && left > 0 && !extraTime} onClick={() => onContinue(answerText)}>{extraTime ? t('scamCheck.continueAnyway') : continueLabel}</button>
          <button type="button" className="ocbc-btn-secondary" onClick={() => onCancel(answerText)}>{t('scamCheck.cancel')}</button>
          <a className="phone-number block py-1 text-center text-sm font-semibold text-[var(--link)] underline" href="tel:1799">{t('scamCheck.callShort')}</a>
          {hold && <button type="button" className="ocbc-btn-secondary" onClick={talk}>{t('scamCheck.staff')}</button>}
        </div>
      </div>
    </div>,
    host,
  )
}
