import { useState } from 'react'
import { Choice } from '@/components/Choice'
import { VoiceTransferAuthSheet } from '@/components/VoiceTransferAuthSheet'
import { VOICE_TRANSFER_LIMIT_OPTIONS, clampVoiceTransferLimit, formatVoiceTransferAmount } from '@/lib/voiceTransfer'
import type { VoiceTransferConfirm } from '@/lib/types'

type VoiceLimitChoicesProps = {
  value: number
  onChange: (limit: number) => void
  offLabel: string
  label: string
  confirmRaise?: boolean
  confirmMode?: VoiceTransferConfirm
  easierTapping?: boolean
  readAloud?: boolean
  practice?: boolean
  t?: (key: string, vars?: Record<string, string | number>) => string
}

export function VoiceLimitChoices({
  value,
  onChange,
  offLabel,
  label,
  confirmRaise,
  confirmMode = 'faceId',
  easierTapping = false,
  readAloud = false,
  practice = true,
  t = (key) => key,
}: VoiceLimitChoicesProps) {
  const current = clampVoiceTransferLimit(value)
  const [pending, setPending] = useState<number | null>(null)
  const [authOpen, setAuthOpen] = useState(false)

  const choose = (next: number) => {
    if (next === current) return
    if (confirmRaise && next > current) {
      setPending(next)
      setAuthOpen(true)
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
      {confirmRaise && (
        <VoiceTransferAuthSheet
          open={authOpen}
          confirmMode={confirmMode}
          easierTapping={easierTapping}
          readAloud={readAloud}
          practice={practice}
          t={t}
          onClose={() => {
            setAuthOpen(false)
            setPending(null)
          }}
          onVerified={() => {
            if (pending !== null) onChange(pending)
            setAuthOpen(false)
            setPending(null)
          }}
          onLocked={() => {
            setAuthOpen(false)
            setPending(null)
          }}
        />
      )}
    </>
  )
}