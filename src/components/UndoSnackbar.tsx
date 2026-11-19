import { useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import type { PresetSnapshot } from '@/lib/presets'

export function UndoSnackbar({
  snapshot,
  onUndo,
  onDone,
}: {
  snapshot: PresetSnapshot | null
  onUndo: () => void
  onDone: () => void
}) {
  const app = useApp()
  const t = (key: string) => translate(app.prefs.language, key)

  useEffect(() => {
    if (!snapshot) return
    const timer = window.setTimeout(onDone, 5000)
    return () => window.clearTimeout(timer)
  }, [snapshot, onDone])

  if (!snapshot) return null

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl bg-[#2A3B43] p-3 text-white shadow-lg" role="status">
      <p className="text-sm font-semibold">{t('customise.presetApplied')}</p>
      <button type="button" className="mt-2 min-h-11 w-full rounded-lg bg-white px-3 font-bold text-[#2A3B43]" onClick={onUndo}>
        {t('customise.undo')}
      </button>
    </div>
  )
}