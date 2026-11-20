import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { normalizeLineHeight, rulerBandHeightPx } from '@/lib/readingComfort'

function rootScale(root: HTMLElement) {
  const rect = root.getBoundingClientRect()
  return rect.height / root.offsetHeight || 1
}

export function ReadingRuler() {
  const app = useApp()
  const on = app.prefs.readingRuler
  const t = (key: string) => translate(app.prefs.language, key)
  const bandH = rulerBandHeightPx(app.prefs.textSize, normalizeLineHeight(app.prefs.lineHeight))
  const [y, setY] = useState(120)
  const targetRef = useRef(120)
  const rafRef = useRef(0)

  const positionFromClient = useCallback(
    (clientY: number) => {
      const root = document.getElementById('customer-root')
      if (!root) return
      const rect = root.getBoundingClientRect()
      const scale = rootScale(root)
      const local = (clientY - rect.top) / scale
      const half = bandH / 2
      const maxY = Math.max(half, root.clientHeight - half)
      targetRef.current = Math.min(Math.max(local, half), maxY)
    },
    [bandH],
  )

  useEffect(() => {
    if (!on) return
    const root = document.getElementById('customer-root')
    if (!root) return
    const mid = root.clientHeight / 2
    targetRef.current = mid
    setY(mid)
  }, [on, bandH])

  useEffect(() => {
    if (!on) return
    const tick = () => {
      setY((current) => {
        const next = targetRef.current
        const diff = next - current
        if (Math.abs(diff) < 0.5) return next
        return current + diff * 0.35
      })
      rafRef.current = window.requestAnimationFrame(tick)
    }
    rafRef.current = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(rafRef.current)
  }, [on])

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

  useEffect(() => {
    if (!on) return
    const step = 18
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
      event.preventDefault()
      const root = document.getElementById('customer-root')
      if (!root) return
      const half = bandH / 2
      const maxY = Math.max(half, root.clientHeight - half)
      const delta = event.key === 'ArrowUp' ? -step : step
      targetRef.current = Math.min(Math.max(targetRef.current + delta, half), maxY)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [on, bandH])

  if (!on) return null

  const top = Math.max(0, y - bandH / 2)

  return (
    <div
      className="reading-ruler pointer-events-none absolute inset-0 z-[65] overflow-hidden"
      aria-hidden
      data-reading-ruler=""
    >
      <div className="reading-ruler-dim absolute inset-x-0 top-0 bg-black/18 transition-[height] duration-75 ease-out" style={{ height: top }} />
      <div
        className="reading-ruler-band absolute inset-x-0 border-y-2 border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--card))] transition-[top] duration-75 ease-out"
        style={{ top, height: bandH }}
      />
      <div className="reading-ruler-dim absolute inset-x-0 bg-black/18 transition-[top] duration-75 ease-out" style={{ top: top + bandH, bottom: 0 }} />
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