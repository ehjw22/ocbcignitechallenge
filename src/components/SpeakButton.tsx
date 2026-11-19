import { Square, Volume2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { recordSpeakTap } from '@/lib/adaptiveNudges'

export function SpeakButton({
  playing,
  onClick,
  listenLabel,
  stopLabel,
}: {
  playing: boolean
  onClick: () => void
  listenLabel: string
  stopLabel: string
}) {
  const app = useApp()
  return (
    <button
      type="button"
      className={`speak-btn ${playing ? 'is-on' : ''}`}
      onClick={() => {
        if (!playing) recordSpeakTap(app.profile.id)
        onClick()
      }}
      aria-label={playing ? stopLabel : listenLabel}
      aria-pressed={playing}
      aria-busy={playing}
    >
      {playing ? <Square aria-hidden size={14} fill="currentColor" /> : <Volume2 aria-hidden size={20} />}
    </button>
  )
}
