import { useRef, useState } from 'react'

export function ChatHoldButton({
  label,
  holdingLabel,
  easier,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  label: string
  holdingLabel: string
  easier: boolean
  confirmLabel: string
  onConfirm: () => void
  disabled?: boolean
}) {
  const [progress, setProgress] = useState(0)
  const [armed, setArmed] = useState(false)
  const frameRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const doneRef = useRef(false)

  const clear = () => {
    if (frameRef.current != null) window.cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    startRef.current = null
  }

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    clear()
    onConfirm()
  }

  const tick = (now: number) => {
    if (startRef.current == null || doneRef.current) return
    const next = Math.min(1, (now - startRef.current) / 1500)
    setProgress(next)
    if (next >= 1) {
      finish()
      return
    }
    frameRef.current = window.requestAnimationFrame(tick)
  }

  const startHold = () => {
    if (disabled || doneRef.current) return
    startRef.current = performance.now()
    setProgress(0.02)
    frameRef.current = window.requestAnimationFrame(tick)
  }

  const cancel = () => {
    if (doneRef.current) return
    clear()
    setProgress(0)
  }

  if (easier) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled={disabled}
          className="min-h-14 w-full rounded-xl bg-[var(--accent)] px-4 font-semibold text-[var(--on-accent)] disabled:opacity-50"
          onClick={() => setArmed(true)}
        >
          {label}
        </button>
        {armed && (
          <button
            type="button"
            disabled={disabled}
            className="min-h-14 w-full rounded-xl border-2 border-[var(--accent)] bg-[var(--card)] px-4 font-bold text-[var(--accent)]"
            onClick={finish}
          >
            {confirmLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      className="relative min-h-14 w-full overflow-hidden rounded-xl bg-[#2A3B43] px-4 font-semibold text-white disabled:opacity-50"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        startHold()
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-0 bg-[var(--accent)]"
        style={{ width: `${Math.round(progress * 100)}%` }}
        aria-hidden
      />
      <span className="relative z-[1]">{progress > 0 && progress < 1 ? holdingLabel : label}</span>
    </button>
  )
}