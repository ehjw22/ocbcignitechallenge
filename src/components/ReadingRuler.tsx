import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import {
  clampRulerCenterY,
  normalizeLineHeight,
  pointerInsideRoot,
  rulerBandHeightPx,
  rulerBandTop,
  rulerLocalYFromClient,
  rulerRootScale,
} from '@/lib/readingComfort'

export function ReadingRuler() {
  const app = useApp()
  const on = app.prefs.readingRuler
  const t = (key: string) => translate(app.prefs.language, key)
  const bandH = rulerBandHeightPx(app.prefs.textSize, normalizeLineHeight(app.prefs.lineHeight))
  const [y, setY] = useState(120)

  const applyClientY = useCallback(
    (clientX: number, clientY: number, dragging: boolean) => {
      const root = document.getElementById('customer-root')
      if (!root) return
      const rect = root.getBoundingClientRect()
      const inside = pointerInsideRoot(clientX, clientY, rect.left, rect.top, rect.width, rect.height)
      if (!inside && !dragging) return
      const scale = rulerRootScale(rect.height, root.offsetHeight)
      const local = rulerLocalYFromClient(clientY, rect.top, scale)
      setY(clampRulerCenterY(local, bandH, root.clientHeight))
    },
    [bandH],
  )

  useEffect(() => {
    if (!on) return
    const root = document.getElementById('customer-root')
    if (!root) return
    const mid = root.clientHeight / 2
    setY(clampRulerCenterY(mid, bandH, root.clientHeight))
  }, [on, bandH])

  useEffect(() => {
    if (!on) return
    const onPointer = (event: PointerEvent) => {
      applyClientY(event.clientX, event.clientY, event.buttons !== 0)
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [on, applyClientY])

  useEffect(() => {
    if (!on) return
    const step = 18
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      event.preventDefault()
      const root = document.getElementById('customer-root')
      if (!root) return
      const delta = event.key === 'ArrowUp' ? -step : step
      setY((current) => clampRulerCenterY(current + delta, bandH, root.clientHeight))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [on, bandH])

  if (!on) return null

  const top = rulerBandTop(y, bandH)

  return (
    <div
      className="reading-ruler pointer-events-none absolute inset-0 z-[65] overflow-hidden"
      aria-hidden
      data-reading-ruler=""
    >
      <div className="reading-ruler-dim absolute inset-x-0 top-0" style={{ height: top }} />
      <div className="reading-ruler-band absolute inset-x-0" style={{ top, height: bandH }} />
      <div className="reading-ruler-dim absolute inset-x-0 bottom-0" style={{ top: top + bandH }} />
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