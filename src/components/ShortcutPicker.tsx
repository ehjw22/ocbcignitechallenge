import { useState } from 'react'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { SHORTCUTS } from '@/lib/languages'

export function ShortcutPicker({
  order,
  onChange,
}: {
  order: string[]
  onChange: (next: string[]) => void
}) {
  const app = useApp()
  const t = (key: string, vars?: Record<string, string | number>) => translate(app.prefs.language, key, vars)
  const [drag, setDrag] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const full = order.length >= 6
  const cols = app.prefs.textSize >= 20 ? 'grid-cols-1' : 'grid-cols-2'
  const ranked = [...order, ...SHORTCUTS.filter((id) => !order.includes(id))]

  const move = (index: number, dir: number) => {
    const next = [...order]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onChange(next)
  }

  const toggle = (id: string) => {
    if (order.includes(id)) {
      setNote('')
      onChange(order.filter((item) => item !== id))
      return
    }
    if (full) {
      setNote(t('shortcutFull'))
      return
    }
    setNote('')
    onChange([...order, id])
  }

  return (
    <div>
      <p className="font-semibold">{t('selectedCount', { n: order.length })}</p>
      <p className="mt-1 text-sm leading-snug text-[var(--muted)]">{t('reorderHint')}</p>
      <div className={`mt-3 grid gap-3 ${cols}`}>
        {ranked.map((id) => {
          const index = order.indexOf(id)
          const selected = index >= 0
          return (
            <div
              key={id}
              className="min-w-0"
              draggable={selected}
              onDragStart={() => selected && setDrag(index)}
              onDragOver={(event) => {
                if (selected) event.preventDefault()
              }}
              onDrop={() => {
                if (!selected || drag == null || drag === index) return
                const next = [...order]
                const [item] = next.splice(drag, 1)
                next.splice(index, 0, item)
                onChange(next)
                setDrag(null)
              }}
            >
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(id)}
                className={`relative flex min-h-12 w-full items-center rounded-2xl px-3 py-3 pr-10 text-left leading-snug ${
                  selected
                    ? 'border-2 border-[var(--accent)] font-bold'
                    : `border border-[var(--line)] bg-[var(--card)] font-medium ${full ? 'opacity-45' : ''}`
                }`}
                style={selected ? { background: 'color-mix(in srgb, var(--accent) 14%, var(--card))' } : undefined}
              >
                <span className="min-w-0 break-words">{t(`shortcuts.${id}`)}</span>
                {selected && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--on-accent)]" aria-hidden>
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </button>
              {selected && (
                <span className="mt-1 flex justify-end gap-1">
                  <button type="button" className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--line)]" aria-label={t('moveUp')} disabled={index === 0} onClick={() => move(index, -1)}>
                    <ChevronUp aria-hidden size={18} />
                  </button>
                  <button type="button" className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--line)]" aria-label={t('moveDown')} disabled={index === order.length - 1} onClick={() => move(index, 1)}>
                    <ChevronDown aria-hidden size={18} />
                  </button>
                </span>
              )}
            </div>
          )
        })}
      </div>
      {note && <p className="mt-2" role="status">{note}</p>}
    </div>
  )
}
