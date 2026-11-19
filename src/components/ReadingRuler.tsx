import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { normalizeLineHeight, rulerBandHeightPx } from '@/lib/readingComfort'

export function ReadingRuler() {
  const app = useApp()
  const on = app.prefs.readingRuler
  const t = (key: string) => translate(app.prefs.language, key)
  const bandH = rulerBandHeightPx(app.prefs.textSize, normalizeLineHeight(app.prefs.lineHeight))
  const [y, setY] = useState(120)

  const positionFromClient = useCallback(
    (clientY: number) => {
      const root = document.getElementById('customer-root')
      if (!root) return
      const rect = root.getBoundingClientRect()
      const local = clientY - rect.top
      const half = bandH / 2
      setY(Math.min(Math.max(local, half), Math.max(half, rect.height - half)))
    },
    [bandH],
  )

  useEffect(() => {
    if (!on) return
    const root = document.getElementById('customer-root')
    if (!root) return
    const rect = root.getBoundingClientRect()
    setY(rect.height / 2)
  }, [on, bandH])

  useEffect(() => {
    if (!on) return
    const onMove = (event: PointerEvent) => positionFromClient(event.clientY)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
    }
  }, [on, positionFromClient])

  if (!on) return null

  const top = Math.max(0, y - bandH / 2)

  return (
    <div
      className="reading-ruler pointer-events-none absolute inset-0 z-[65] overflow-hidden"
      aria-hidden
      data-reading-ruler=""
    >
      <div className="reading-ruler-dim absolute inset-x-0 top-0 bg-black/30" style={{ height: top }} />
      <div
        className="reading-ruler-band absolute inset-x-0 border-y border-amber-400/50 bg-amber-100/45 mix-blend-multiply dark:border-amber-300/40 dark:bg-amber-200/25 dark:mix-blend-screen"
        style={{ top, height: bandH }}
      />
      <div className="reading-ruler-dim absolute inset-x-0 bg-black/30" style={{ top: top + bandH, bottom: 0 }} />
      <button
        type="button"
        className="pointer-events-auto absolute right-2 top-2 z-[1] flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--text)] shadow-sm"
        aria-label={t('settings.readingRulerClose')}
        onClick={() => app.updatePrefs({ readingRuler: false })}
      >
        <X aria-hidden size={20} />
      </button>
      <span className="sr-only">{t('settings.readingRulerOn')}</span>
    </div>
  )
}