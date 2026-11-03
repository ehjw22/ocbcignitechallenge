import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '@/context/AppContext'
import { Speakable } from '@/components/Speakable'
import { translate } from '@/i18n'
import { formatSGD } from '@/lib/format'
import { SCAM_COOLING_LIMIT, SCAM_COOLING_SECONDS, setScamSheetOpen, type ScamReason } from '@/lib/scamCheck'

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
  reasons,
  flowId,
  onCancel,
  onContinue,
  onClose,
}: {
  amount: number
  name: string
  reasons: ScamReason[]
  flowId: string
  onCancel: (answers: string) => void
  onContinue: (answers: string) => void
  onClose: () => void
}) {
  const app = useApp()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([null, null, null])
  const [left, setLeft] = useState(SCAM_COOLING_SECONDS)
  const flagged = answers.some((item) => item === 'yes')
  const answered = answers.every((item) => item !== null)
  const allNo = answers.every((item) => item === 'no')
  const cooling = allNo && amount >= SCAM_COOLING_LIMIT
  const answerText = answers.map((item) => item || 'blank').join(',')
  const money = formatSGD(amount)
  const spoken = [
    t('scamCheck.title'),
    t('scamCheck.amountLine', { amount: money, name }),
    t('scamCheck.q1'),
    t('scamCheck.q2'),
    t('scamCheck.q3'),
    flagged ? t('scamCheck.warning') : '',
  ].filter(Boolean).join(' ')

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
    if (!cooling) return
    setLeft(SCAM_COOLING_SECONDS)
    const timer = window.setInterval(() => {
      setLeft((value) => (value <= 1 ? 0 : value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooling])

  const choose = (slot: number, value: Answer) => {
    setAnswers((prev) => prev.map((item, index) => (index === slot ? value : item)))
  }

  const talk = () => {
    const summary = `Possible scam. ${money} to ${name}.`
    const request = app.addRequest({
      summary,
      summaryEn: `${summary} Flow: ${flowId}. Reasons: ${reasons.join(', ')}. Answers: ${answerText}.`,
      task: flowId,
      step: 'before review',
      language: app.prefs.language,
      method: 'message',
      time: '',
      contact: '',
      urgent: true,
      customerName: app.profile?.name || '',
      needs: 'Possible scam',
      transcript: `Ollie scam check. ${summary} Reasons: ${reasons.join(', ')}. Answers: ${answerText}.`,
    })
    app.log('scam_check', { trigger: reasons.join(','), answers: answerText, result: 'staff', screen: flowId, amount, ref: request.ref })
    app.log('staff_request', { ref: request.ref, task: 'possible-scam' })
    app.setStaffSeed(summary)
    app.openHelp('staff')
    onClose()
  }

  if (!host) return null

  const continueLabel = cooling && left > 0 ? t('scamCheck.coolingLeft', { n: left }) : t('scamCheck.continueAnyway')

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
          <p className="text-center text-[13px] font-semibold text-[var(--muted)]">{t('look.ollieSafety')} <span className="rounded-full bg-[var(--soft)] px-2 py-0.5 text-[11px]">{t('look.new')}</span></p>
          <div className="mx-auto my-3 grid h-16 w-16 place-items-center rounded-full bg-[#FFF3D6] text-4xl" aria-hidden>!</div>
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-semibold text-white" style={{ background: '#E30613' }} aria-hidden>O</span>
            <p className="min-w-0 flex-1 text-sm font-semibold">{t('ai.header')}</p>
            <div className="shrink-0 [&>span]:w-auto">
              <Speakable text={spoken} auto={app.prefs.readAloud} hideText />
            </div>
          </div>
          <h2 id="scam-check-title" className="text-lg font-semibold leading-snug">{t('scamCheck.title')}</h2>
          <p className="mt-3 rounded-2xl bg-[var(--soft)] px-3 py-3 text-base font-semibold">
            {t('scamCheck.amountLine', { amount: money, name })}
          </p>
          <div className="mt-4 space-y-4">
            {(['scamCheck.q1', 'scamCheck.q2', 'scamCheck.q3'] as const).map((key, slot) => (
              <div key={key}>
                <p id={`scam-q-${slot}`} className="mb-2 leading-snug">{t(key)}</p>
                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--line)]" role="group" aria-labelledby={`scam-q-${slot}`}>
                  <button
                    type="button"
                    className={`min-h-12 border-r border-[var(--line)] px-2 font-semibold ${answers[slot] === 'yes' ? 'bg-[var(--slate)] text-white' : 'bg-[var(--card)] text-[var(--text)]'}`}
                    aria-pressed={answers[slot] === 'yes'}
                    onClick={() => choose(slot, 'yes')}
                  >
                    {t('scamCheck.yes')}
                  </button>
                  <button
                    type="button"
                    className={`min-h-12 px-2 font-semibold ${answers[slot] === 'no' ? 'bg-[var(--slate)] text-white' : 'bg-[var(--card)] text-[var(--text)]'}`}
                    aria-pressed={answers[slot] === 'no'}
                    onClick={() => choose(slot, 'no')}
                  >
                    {t('scamCheck.no')}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {cooling && left > 0 && !flagged && <p className="mt-3 font-semibold">{t('scamCheck.cooling')}</p>}
        </div>
        <div className="shrink-0 space-y-2 border-t border-[var(--line)] bg-[var(--card)] px-4 py-3">
          {flagged ? (
            <>
              <p className="font-semibold text-[var(--danger)]">{t('scamCheck.warning')}</p>
              <button type="button" className="ocbc-btn !bg-[#E30613]" onClick={() => onCancel(answerText)}>{t('scamCheck.cancel')}</button>
              <a className="phone-number flex min-h-12 items-center justify-center rounded-lg border border-[var(--line)] px-3 text-center font-semibold text-[var(--link)]" href="tel:1799">{t('scamCheck.callShort')}</a>
              <button type="button" className="tap w-full rounded-lg border border-[var(--line)] bg-[var(--card)] font-semibold" onClick={talk}>{t('scamCheck.staff')}</button>
            </>
          ) : (
            <>
              <button type="button" className="ocbc-btn" onClick={() => onCancel(answerText)}>{t('scamCheck.cancel')}</button>
              <button
                type="button"
                className="ocbc-btn-secondary disabled:opacity-50"
                disabled={!answered || (cooling && left > 0)}
                onClick={() => onContinue(answerText)}
              >
                {continueLabel}
              </button>
              <a className="phone-number block py-1 text-center text-sm font-semibold text-[var(--link)] underline" href="tel:1799">{t('scamCheck.callShort')}</a>
            </>
          )}
        </div>
      </div>
    </div>,
    host,
  )
}
