import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { executeDemoTransfer, transferExpired } from '@/lib/chatTransfer'
import { formatMoney, formatSGD } from '@/lib/format'
import type { ChatMessage, VoiceTransferCard } from '@/lib/types'
import type { VoiceMatch } from '@/lib/voiceTransfer'
import { ChatHoldButton } from './ChatHoldButton'
import { Speakable } from './Speakable'
import { receiptPaidText, receiptWhenLabel, SuccessReceipt } from './SuccessReceipt'

type Props = {
  message: ChatMessage
  scamAnswers: Array<'yes' | 'no' | null>
  cancelled: boolean
  onScamAnswer: (slot: number, value: 'yes' | 'no') => void
  onCancel: () => void
  onUpdateCard: (card: VoiceTransferCard) => void
  onDone: (content: string, card: VoiceTransferCard) => void
  onOpenSettings: () => void
  practice: boolean
}

export function ChatTransferMessage({ message, scamAnswers, cancelled, onScamAnswer, onCancel, onUpdateCard, onDone, onOpenSettings, practice }: Props) {
  const app = useApp()
  const navigate = useNavigate()
  const vt = message.voiceTransfer
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const receiptRef = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState(false)
  const match: VoiceMatch | null =
    vt?.payeeId && vt.fields && vt.flow
      ? (() => {
          const payee = app.payees.find((item) => item.id === vt.payeeId)
          return payee ? { payee, flow: vt.flow as VoiceMatch['flow'], fields: vt.fields } : null
        })()
      : null

  useEffect(() => {
    if (!vt?.createdAt || vt.kind === 'receipt' || vt.kind === 'expired' || vt.kind === 'transferError') return
    if (transferExpired(vt.createdAt)) onUpdateCard({ ...vt, kind: 'expired' })
  }, [vt, onUpdateCard])

  useEffect(() => {
    if (vt?.kind !== 'receipt' || vt.receiptImage || !receiptRef.current) return
    void toPng(receiptRef.current, { pixelRatio: 2 })
      .then((url) => onUpdateCard({ ...vt, receiptImage: url }))
      .catch(() => {})
  }, [vt, onUpdateCard])

  if (!vt || cancelled) return null

  const fromAccount = app.accounts.find((account) => account.id === (vt.review?.fromAccountId || vt.fields?.from))
  const fromLabel = fromAccount ? t(fromAccount.nameKey) : vt.review?.fromAccountId || ''
  const reviewText = vt.review
    ? `${t('ai.chatReviewPayee')}: ${vt.review.payeeName}. ${vt.review.payeeMasked}. ${t('ai.chatReviewAmount')}: ${formatSGD(vt.review.amount)}. ${t('ai.chatReviewFrom')}: ${fromLabel}. ${t('flows.now')}.`
    : ''

  const runSend = () => {
    if (!match || !vt.fields || !vt.flow) return
    const result = executeDemoTransfer({
      match,
      practice,
      balances: app.balances,
      profileId: app.profile.id,
      payees: app.payees,
      usualTransfer: app.profile.usualTransfer,
    })
    if (!result.ok) {
      onUpdateCard({ ...vt, kind: 'transferError', errorReason: result.reason, available: result.available })
      return
    }
    if (!practice) {
      app.setBalance(result.fromAccountId, result.newBalance)
      app.addTxn({
        id: result.reference,
        title: result.payeeName,
        amount: -result.amount,
        date: new Date().toISOString().slice(0, 10),
        accountId: result.fromAccountId,
      })
    }
    const when = receiptWhenLabel(app.prefs.language)
    const paidLabel = practice ? t('ai.chatPracticePaid', { amount: formatMoney(result.amount), name: result.payeeName }) : t('look.paid', { amount: formatMoney(result.amount) })
    const doneLine = t('ai.chatDone', { amount: formatSGD(result.amount), name: result.payeeName, balance: formatMoney(practice ? (app.balances[result.fromAccountId] ?? 0) : result.newBalance) })
    const card: VoiceTransferCard = {
      ...vt,
      kind: 'receipt',
      reference: result.reference,
      receiptWhen: when,
      practice,
      amount: result.amount,
      payeeName: result.payeeName,
    }
    onDone(doneLine, card)
  }

  if (vt.kind === 'scamQuiz') {
    const ready = scamAnswers.every((item) => item !== null)
    return (
      <div className="mt-3 space-y-2 rounded-xl border border-[var(--line)] p-3">
        <p className="font-semibold">{t('ai.chatScamIntro')}</p>
        {(['ai.scamQ1', 'ai.scamQ2', 'ai.scamQ3'] as const).map((key, slot) => (
          <div key={key}>
            <p>{t(key)}</p>
            <div className="mt-1 flex gap-2">
              <button type="button" className="min-h-11 rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => onScamAnswer(slot, 'yes')}>{t('ai.scamYes')}</button>
              <button type="button" className="min-h-11 rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => onScamAnswer(slot, 'no')}>{t('ai.scamNo')}</button>
            </div>
          </div>
        ))}
        {ready && (
          <p className="text-sm text-[var(--muted)]">{t('ai.chatScamContinue')}</p>
        )}
        {ready && (
          <button type="button" className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={() => onUpdateCard({ ...vt, kind: 'sendReady' })}>
            {t('ai.chatContinueSend')}
          </button>
        )}
      </div>
    )
  }

  if (vt.kind === 'sendReady' && vt.review) {
    return (
      <div className="mt-3 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--soft)] p-3">
        <h3 className="text-base font-bold">{t('review')}</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">{t('success.payee')}</dt><dd className="font-semibold">{vt.review.payeeName}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">{t('flows.paynowTo')}</dt><dd className="font-semibold">{vt.review.payeeMasked}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">{t('amount')}</dt><dd className="money font-bold">{formatSGD(vt.review.amount)}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">{t('flows.from')}</dt><dd className="font-semibold">{fromLabel}</dd></div>
          <div className="flex justify-between gap-2"><dt className="text-[var(--muted)]">{t('flows.when')}</dt><dd className="font-semibold">{t('flows.now')}</dd></div>
        </dl>
        {app.prefs.readAloud && reviewText && <Speakable text={reviewText} auto hideText />}
        <ChatHoldButton
          label={t('ai.chatConfirmSend')}
          holdingLabel={t('ai.chatHoldProgress')}
          confirmLabel={t('ai.chatSure')}
          easier={app.prefs.easierTapping}
          onConfirm={runSend}
        />
        <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 font-semibold" onClick={onCancel}>{t('ai.chatCancel')}</button>
      </div>
    )
  }

  if (vt.kind === 'receipt') {
    const paidLabel = practice
      ? t('ai.chatPracticePaid', { amount: formatMoney(vt.amount), name: vt.payeeName })
      : receiptPaidText(vt.amount, vt.payeeName)
    return (
      <div className="mt-3 space-y-2">
        {vt.receiptImage ? (
          <button type="button" className="block w-full overflow-hidden rounded-xl border border-[var(--line)]" onClick={() => setPreview(true)}>
            <img src={vt.receiptImage} alt="" className="w-full object-contain" />
          </button>
        ) : (
          <SuccessReceipt
            ref={receiptRef}
            data={{ amount: vt.amount, payeeName: vt.payeeName, reference: vt.reference || '', when: vt.receiptWhen || '', fromLabel, practice: Boolean(vt.practice) }}
            paidLabel={paidLabel}
            practiceLabel={t('practice.banner')}
          />
        )}
        <div className="flex flex-col gap-2">
          <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => { app.setHelpOpen(false); navigate('/accounts') }}>{t('ai.chatViewTxn')}</button>
          <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => app.openHelp('staff')}>{t('ai.chatCantUndo')}</button>
        </div>
        {preview && vt.receiptImage && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4" onClick={() => setPreview(false)}>
            <img src={vt.receiptImage} alt="" className="max-h-[80vh] max-w-full rounded-xl" />
            <div className="mt-3 flex flex-wrap gap-2">
              {typeof navigator.share === 'function' && (
                <button
                  type="button"
                  className="min-h-11 rounded-xl bg-white px-4 py-2 font-semibold text-[#1a1a1a]"
                  onClick={(event) => {
                    event.stopPropagation()
                    void fetch(vt.receiptImage!)
                      .then((res) => res.blob())
                      .then((blob) => {
                        const file = new File([blob], 'transfer-receipt.png', { type: 'image/png' })
                        return navigator.share({ files: [file], title: t('success.demo') })
                      })
                      .catch(() => {})
                  }}
                >
                  {t('ai.chatShare')}
                </button>
              )}
              <a className="min-h-11 rounded-xl bg-white px-4 py-2 font-semibold text-[#1a1a1a]" href={vt.receiptImage} download="transfer-receipt.png" onClick={(event) => event.stopPropagation()}>{t('ai.chatSaveImage')}</a>
              <button type="button" className="min-h-11 rounded-xl border border-white px-4 font-semibold text-white" onClick={() => setPreview(false)}>{t('close')}</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (vt.kind === 'transferError') {
    return (
      <div className="mt-3 space-y-2 rounded-xl border border-[var(--danger)] p-3">
        <p className="font-semibold text-[var(--danger)]">
          {vt.errorReason === 'insufficient' ? t('ai.chatInsufficient', { available: formatMoney(vt.available ?? 0) }) : t('ai.voiceBadAmount')}
        </p>
        <button type="button" className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-3 font-semibold text-[var(--on-accent)]" onClick={() => navigate('/flow/paynow')}>{t('ai.voiceOpenTransfer')}</button>
        <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={onOpenSettings}>{t('ai.voiceOpenSettings')}</button>
      </div>
    )
  }

  if (vt.kind === 'expired') {
    return <p className="mt-3 text-sm font-semibold text-[var(--muted)]">{t('ai.chatExpired')}</p>
  }

  return null
}