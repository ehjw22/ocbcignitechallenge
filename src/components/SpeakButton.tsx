import { Pause, Volume2 } from 'lucide-react'

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
  return (
    <button
      type="button"
      className={`speak-pill ${playing ? 'is-on' : ''}`}
      onClick={onClick}
      aria-label={playing ? stopLabel : listenLabel}
      aria-pressed={playing}
    >
      {playing ? <Pause aria-hidden size={16} /> : <Volume2 aria-hidden size={18} />}
      <span className="speak-waves" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="speak-word">{playing ? stopLabel : ''}</span>
    </button>
  )
}
