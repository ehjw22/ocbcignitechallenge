import { Check, ScanFace, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { Speakable } from '@/components/Speakable'
import type { VoiceTransferConfirm } from '@/lib/types'
import { attemptVoiceTransferPin, VOICE_TRANSFER_PIN_LENGTH } from '@/lib/voiceTransferPin'

type Props = {
  open: boolean
  confirmMode: VoiceTransferConfirm
  easierTapping: boolean
  readAloud: boolean
  practice: boolean
  t: (key: string, vars?: Record<string, string | number>) => string
  onClose: () => void
  onVerified: () => void
  onLocked: () => void
}

type Phase = 'face' | 'pin' | 'verified'

/** Simulated Face ID / PIN sheet for demo voice transfers — not real biometrics. */
export function VoiceTransferAuthSheet({ open, confirmMode, easierTapping, readAloud, practice, t, onClose, onVerified, onLocked }: Props) {
  const app = useApp()
  const [phase, setPhase] = useState<Phase>(confirmMode === 'pin' ? 'pin' : 'face')
  const [scanning, setScanning] = useState(false)
  const [pin, setPin] = useState('')
  const failedRef = useRef(0)
  const [pinError, setPinError] = useState('')

  useEffect(() => {
    if (!open) {
      setPhase(confirmMode === 'pin' ? 'pin' : 'face')
      setScanning(false)
      setPin('')
      failedRef.current = 0
      setPinError('')
      return
    }
    setPhase(confirmMode === 'pin' ? 'pin' : 'face')
    setPin('')
    failedRef.current = 0
    setPinError('')
  }, [open, confirmMode])

  useEffect(() => {
    if (!open || phase !== 'face' || confirmMode !== 'faceId') return
    setScanning(true)
    const timer = window.setTimeout(() => {
      setScanning(false)
      setPhase('verified')
      app.setNotice(t('ai.chatVerified'))
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [open, phase, confirmMode, app, t])

  useEffect(() => {
    if (!open || phase !== 'verified') return
    const done = window.setTimeout(() => {
      app.setNotice('')
      onVerified()
    }, 650)
    return () => window.clearTimeout(done)
  }, [open, phase, app, onVerified])

  const pinKey = (digit: string) => {
    if (pin.length >= VOICE_TRANSFER_PIN_LENGTH) return
    const next = pin + digit
    setPin(next)
    setPinError('')
    if (next.length < VOICE_TRANSFER_PIN_LENGTH) return
    const result = attemptVoiceTransferPin(next, failedRef.current)
    if (result.ok) {
      setPhase('verified')
      app.setNotice(t('ai.chatVerified'))
      return
    }
    setPin('')
    if (result.reason === 'locked') {
      onLocked()
      return
    }
    failedRef.current += 1
    setPinError(t('ai.chatPinWrong', { left: result.attemptsLeft }))
  }

  const erasePin = () => {
    setPin((value) => value.slice(0, -1))
    setPinError('')
  }

  if (!open) return null

  const keyClass = easierTapping
    ? 'flex h-16 w-16 items-center justify-center rounded-full bg-[var(--soft)] text-xl font-bold'
    : 'flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft)] text-lg font-bold'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="vt-auth-title">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <h2 id="vt-auth-title" className="text-lg font-bold">
            {phase === 'pin' ? t('ai.chatEnterPin') : t('ai.chatVerifyFaceTitle')}
          </h2>
          <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)]" aria-label={t('close')} onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </div>
        {phase === 'face' && (
          <div className="mt-4 flex flex-col items-center gap-3 pb-2">
            <p className="text-center text-sm text-[var(--muted)]">{t('ai.chatVerifyFaceBody')}</p>
            <div className={`relative grid h-28 w-28 place-items-center rounded-full border-2 ${scanning ? 'border-[var(--accent)] vt-face-scan' : 'border-[var(--line)]'}`}>
              <ScanFace size={56} aria-hidden className={scanning ? 'text-[var(--accent)]' : 'text-[var(--muted)]'} />
            </div>
            <p className="text-sm font-semibold text-[var(--muted)]" aria-live="polite">
              {scanning ? t('ai.chatVerifyScanning') : ''}
            </p>
            {readAloud && scanning && <Speakable text={t('ai.chatVerifyScanning')} auto hideText />}
            <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => setPhase('pin')}>
              {t('ai.chatUsePinInstead')}
            </button>
          </div>
        )}
        {phase === 'verified' && (
          <div className="mt-6 flex flex-col items-center gap-3 pb-4">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[#0d7a3e]/15 text-[#0d7a3e]">
              <Check size={44} strokeWidth={3} aria-hidden />
            </div>
            <p className="text-lg font-bold text-[#0d7a3e]">{t('ai.chatVerified')}</p>
            {readAloud && <Speakable text={t('ai.chatVerified')} auto hideText />}
          </div>
        )}
        {phase === 'pin' && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-[var(--muted)]">{t('ai.chatEnterPinBody')}</p>
            {readAloud && <Speakable text={t('ai.chatEnterPin')} auto hideText />}
            {practice && <p className="rounded-xl bg-[var(--soft)] px-3 py-2 text-sm font-semibold">{t('ai.chatPinDemoHint')}</p>}
            <div className="flex justify-center gap-2" aria-hidden>
              {Array.from({ length: VOICE_TRANSFER_PIN_LENGTH }, (_, i) => (
                <span key={i} className={`h-3 w-3 rounded-full ${i < pin.length ? 'bg-[var(--text)]' : 'bg-[var(--line)]'}`} />
              ))}
            </div>
            {pinError && (
              <p className="text-center text-sm font-semibold text-[var(--danger)]" role="alert">
                {pinError}
              </p>
            )}
            <div className="mx-auto grid max-w-[14rem] grid-cols-3 gap-2 place-items-center">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button key={digit} type="button" className={keyClass} onClick={() => pinKey(digit)}>
                  {digit}
                </button>
              ))}
              <span />
              <button type="button" className={keyClass} onClick={() => pinKey('0')}>
                0
              </button>
              <button type="button" className={`${keyClass} text-sm`} onClick={erasePin} aria-label={t('ai.chatPinBackspace')}>
                ⌫
              </button>
            </div>
            {confirmMode === 'faceId' && (
              <button type="button" className="min-h-11 w-full rounded-xl border border-[var(--line)] px-3 font-semibold" onClick={() => setPhase('face')}>
                {t('ai.chatUseFaceInstead')}
              </button>
            )}
          </div>
        )}
        <p className="mt-2 text-center text-xs text-[var(--muted)]">{t('ai.chatVerifyDemoNote')}</p>
      </div>
    </div>
  )
}