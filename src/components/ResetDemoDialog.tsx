import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export function ResetDemoDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null
  const host = typeof document !== 'undefined' ? document.body : null
  if (!host) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="presentation" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-[var(--card)] p-4 text-[var(--text)] shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-[15px] leading-snug">{body}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button ref={confirmRef} type="button" className="min-h-14 rounded-xl bg-[var(--accent)] px-4 text-lg font-semibold text-[var(--on-accent)]" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="min-h-14 rounded-xl border border-[var(--line)] px-4 text-lg font-semibold" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    host,
  )
}