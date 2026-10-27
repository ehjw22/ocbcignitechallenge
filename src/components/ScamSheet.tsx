import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Speakable } from '@/components/Speakable'
import { translate } from '@/i18n'
import { formatSGD } from '@/lib/format'
import { SCAM_COOLING_LIMIT, SCAM_COOLING_SECONDS, type ScamReason } from '@/lib/scamCheck'

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
  const [answers, setAnswers] = useState<Answer[]>([null, null, null])
  const [left, setLeft] = useState(SCAM_COOLING_SECONDS)
  const flagged = answers.some((item) => item === 'yes')
  const allNo = answers.every((item) => item === 'no')
  const cooling = allNo && amount >= SCAM_COOLING_LIMIT
  const answerText = answers.map((item) => item || 'blank').join(',')
  const spoken = [
    t('scamCheck.title'),
    t('scamCheck.amountLine', { amount: formatSGD(amount), name }),
    t('scamCheck.q1'),
    t('scamCheck.q2'),
    t('scamCheck.q3'),
    flagged ? t('scamCheck.warning') : '',
  ].filter(Boolean).join(' ')

  useEffect(() => {
    if (!cooling) return
    setLeft(SCAM_COOLING_SECONDS)
    const timer = window.setInterval(() => {
      setLeft((value) => (value <= 1 ? 0 : value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooling])

  const talk = () => {
    const summary = `Possible scam. ${formatSGD(amount)} to ${name}.`
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" role="presentation">
      <div className="flex h-full w-full max-w-[390px] items-end">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scam-check-title"
        className="max-h-[88%] w-full overflow-y-auto rounded-t-2xl bg-[var(--surface)] p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-semibold text-white" style={{ background: '#E30613' }} aria-hidden>O</span>
          <p className="text-sm font-semibold">{t('ai.header')}</p>
        </div>
        <h2 id="scam-check-title" className="text-lg font-semibold">{t('scamCheck.title')}</h2>
        <p className="mt-1 text-base font-semibold">{t('scamCheck.amountLine', { amount: formatSGD(amount), name })}</p>
        <Speakable text={spoken} auto={app.prefs.readAloud} hideText />
        <div className="mt-3 space-y-3">
          {(['scamCheck.q1', 'scamCheck.q2', 'scamCheck.q3'] as const).map((key, slot) => (
            <div key={key}>
              <p>{t(key)}</p>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button type="button" className="min-h-11 rounded-xl border border-[var(--line)] font-semibold" aria-pressed={answers[slot] === 'yes'} onClick={() => setAnswers((prev) => prev.map((item, index) => (index === slot ? 'yes' : item)))}>{t('scamCheck.yes')}</button>
                <button type="button" className="min-h-11 rounded-xl border border-[var(--line)] font-semibold" aria-pressed={answers[slot] === 'no'} onClick={() => setAnswers((prev) => prev.map((item, index) => (index === slot ? 'no' : item)))}>{t('scamCheck.no')}</button>
              </div>
            </div>
          ))}
        </div>
        {!flagged && (
          <button type="button" className="tap mt-3 w-full rounded-xl border border-[var(--line)]" onClick={() => onCancel(answerText)}>{t('scamCheck.cancel')}</button>
        )}
        {flagged && (
          <div className="mt-3 space-y-2">
            <p className="font-semibold text-[var(--danger)]">{t('scamCheck.warning')}</p>
            <button type="button" className="ocbc-btn" onClick={() => onCancel(answerText)}>{t('scamCheck.cancel')}</button>
            <ScamHelpline />
            <button type="button" className="tap w-full rounded-xl border border-[var(--line)]" onClick={talk}>{t('scamCheck.staff')}</button>
          </div>
        )}
        {allNo && (
          <div className="mt-3 space-y-2">
            {cooling && left > 0 && <p className="font-semibold">{t('scamCheck.cooling')}</p>}
            <button
              type="button"
              className="ocbc-btn disabled:opacity-50"
              disabled={cooling && left > 0}
              onClick={() => onContinue(answerText)}
            >
              {cooling && left > 0 ? t('scamCheck.coolingLeft', { n: left }) : t('scamCheck.continue')}
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
