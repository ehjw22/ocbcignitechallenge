import { useState } from 'react'
import { Choice } from '@/components/Choice'
import { VOICE_TRANSFER_LIMIT_OPTIONS, clampVoiceTransferLimit, formatVoiceTransferAmount } from '@/lib/voiceTransfer'

type VoiceLimitChoicesProps = {
  value: number
  onChange: (limit: number) => void
  offLabel: string
  label: string
  confirmRaise?: boolean
  confirmTitle?: string
  confirmBody?: string
  confirmAction?: string
  cancelLabel?: string
}

export function VoiceLimitChoices({
  value,
  onChange,
  offLabel,
  label,
  confirmRaise,
  confirmTitle,
  confirmBody,
  confirmAction,
  cancelLabel,
}: VoiceLimitChoicesProps) {
  const current = clampVoiceTransferLimit(value)
  const [pending, setPending] = useState<number | null>(null)

  const choose = (next: number) => {
    if (next === current) return
    if (confirmRaise && next > current) {
      setPending(next)
      return
    }
    onChange(next)
  }

  const optionLabel = (limit: number) => (limit === 0 ? offLabel : formatVoiceTransferAmount(limit))

  return (
    <>
      <div role="radiogroup" aria-label={label} id="voice-limit" data-guide="settings-voice-limit">
        {VOICE_TRANSFER_LIMIT_OPTIONS.map((limit) => (
          <Choice key={limit} selected={current === limit} onClick={() => choose(limit)}>
            {optionLabel(limit)}
          </Choice>
        ))}
      </div>
      {pending !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="voice-limit-raise">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--card)] p-4 text-[var(--text)]">
            <p id="voice-limit-raise" className="text-lg font-bold">{confirmTitle}</p>
            <p className="mt-2">{confirmBody?.replace('{amount}', formatVoiceTransferAmount(pending))}</p>
            <button type="button" className="mt-3 min-h-12 w-full rounded-xl bg-[var(--accent)] font-semibold text-[var(--on-accent)]" onClick={() => { onChange(pending); setPending(null) }}>{confirmAction}</button>
            <button type="button" className="mt-2 min-h-11 w-full font-semibold underline" onClick={() => setPending(null)}>{cancelLabel}</button>
          </div>
        </div>
      )}
    </>
  )
}
