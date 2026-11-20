import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { themeVars } from '@/lib/accent'
import { readingComfortVars, textDisplayVars } from '@/lib/readingComfort'
import { AiPanel } from '@/components/AiPanel'
import { stopSpeaking } from '@/lib/speech'

const PHONE_W = 390
const PHONE_H = 844

export function comparePhoneScale(viewportWidth: number, viewportHeight: number) {
  const padX = 48
  const chrome = 168
  const colGap = 24
  const calloutW = 200
  const pairW = viewportWidth - padX * 2 - colGap - calloutW * 2
  const byWidth = pairW / (PHONE_W * 2)
  const byHeight = (viewportHeight - chrome) / PHONE_H
  return Math.min(0.68, byWidth, byHeight, 1)
}

export function ComparePhoneShell({
  scale,
  rootId,
  children,
  blockInteraction = true,
}: {
  scale: number
  rootId: string
  children: ReactNode
  blockInteraction?: boolean
}) {
  const app = useApp()
  const theme = themeVars(app.prefs)
  const comfort = { ...readingComfortVars(app.prefs), ...textDisplayVars(app.prefs.textSize) }
  const t = (key: string) => translate(app.prefs.language, key)
  const aiFull = app.helpOpen && app.helpView === 'ai'

  useEffect(() => {
    if (!app.helpOpen) stopSpeaking()
  }, [app.helpOpen])

  return (
    <div
      className="relative shrink-0"
      style={{ width: PHONE_W * scale, height: PHONE_H * scale }}
    >
      <div
        className="phone-frame absolute left-0 top-0"
        style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        <div className="phone-notch" aria-hidden />
        <div
          id={rootId}
          className="relative flex h-full flex-col"
          data-scheme={app.prefs.scheme}
          data-contrast={app.prefs.highContrast ? 'high' : 'normal'}
          data-bold={app.prefs.boldText ? 'true' : 'false'}
          data-cvd={app.prefs.colourVision}
          lang={app.prefs.language}
          style={{ ...theme, ...comfort, paddingTop: '28px' }}
        >
          {children}
          {app.helpOpen && (
            <div className={`absolute inset-0 z-40 flex flex-col ${aiFull ? '' : 'justify-end'}`}>
              {!aiFull && <div className="absolute inset-0 bg-black/45" aria-hidden />}
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${rootId}-help-title`}
                className={aiFull ? 'relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--bg)] p-4 text-[var(--text)]' : 'relative max-h-[86%] overflow-y-auto rounded-t-3xl bg-[var(--card)] p-4 text-[var(--text)]'}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 id={`${rootId}-help-title`} className="text-xl font-semibold">{t('help.title')}</h2>
                </div>
                {app.helpView === 'ai' && <AiPanel />}
              </div>
            </div>
          )}
          {blockInteraction && (
            <div className="absolute inset-0 z-[45]" style={{ pointerEvents: 'auto' }} aria-hidden tabIndex={-1} />
          )}
        </div>
      </div>
    </div>
  )
}