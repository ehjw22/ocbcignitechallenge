import { useEffect, useState } from 'react'
import { Volume2, Square } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { translate } from '@/i18n'
import { formatRate, nextRate } from '@/lib/rates'
import { speak, stopSpeaking } from '@/lib/speech'

export function Highlighted({ text, range }: { text: string; range: [number, number] | null }) {
  if (!range || range[0] < 0) return <>{text}</>
  const [start, end] = range
  let cursor = 0
  return (
    <>
      {text.split(/(\s+)/).map((part, index) => {
        const from = cursor
        cursor += part.length
        const on = Boolean(part.trim()) && from < end && cursor > start
        return (
          <span key={`${index}-${part}`} className={on ? 'word-on' : undefined}>
            {part}
          </span>
        )
      })}
    </>
  )
}

export function Speakable({
  text,
  auto = false,
  label,
  hideText = false,
}: {
  text: string
  auto?: boolean
  label?: string
  hideText?: boolean
}) {
  const { prefs, setNotice, updatePrefs } = useApp()
  const t = (key: string, vars?: Record<string, string | number>) => translate(prefs.language, key, vars)
  const [range, setRange] = useState<[number, number] | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!auto || !prefs.readAloud || !text) return
    let live = true
    setPlaying(true)
    void speak(text, {
      language: prefs.language,
      rate: prefs.speechRate,
      dialect: prefs.dialect,
      onRange: (start, end) => live && setRange(start < 0 ? null : [start, end]),
    }).then((mode) => {
      if (!live) return
      setPlaying(false)
      if (mode === 'none' && prefs.dialect === 'cantonese') setNotice(t('speech.noVoice'))
    })
    return () => {
      live = false
      stopSpeaking()
    }
    // Restart when the text, language, or speaking speed changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, auto, prefs.readAloud, prefs.language, prefs.dialect, prefs.speechRate])

  const onClick = async () => {
    if (playing) {
      stopSpeaking()
      setPlaying(false)
      setRange(null)
      return
    }
    setPlaying(true)
    const mode = await speak(text, {
      language: prefs.language,
      rate: prefs.speechRate,
      dialect: prefs.dialect,
      onRange: (start, end) => setRange(start < 0 ? null : [start, end]),
    })
    setPlaying(false)
    if (mode === 'none') setNotice(t('speech.noVoice'))
  }

  return (
    <span className="inline-flex items-start gap-2">
      {!hideText && <span>{label ? <Highlighted text={label} range={range} /> : <Highlighted text={text} range={range} />}</span>}
      <button
        type="button"
        className="tap inline-flex items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] px-2"
        onClick={() => void onClick()}
        aria-label={playing ? t('stop') : t('listen')}
        aria-pressed={playing}
      >
        {playing ? <Square aria-hidden size={18} /> : <Volume2 aria-hidden size={18} />}
        <span className="sr-only">{playing ? t('stop') : t('listen')}</span>
      </button>
      <button
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--card)] px-2 text-sm font-semibold"
        aria-label={`${t('speakingSpeed')} ${formatRate(prefs.speechRate)}`}
        onClick={() => {
          const next = nextRate(prefs.speechRate)
          updatePrefs({ speechRate: next })
          if (!playing) return
          stopSpeaking()
          setPlaying(true)
          void speak(text, {
            language: prefs.language,
            rate: next,
            dialect: prefs.dialect,
            onRange: (start, end) => setRange(start < 0 ? null : [start, end]),
          }).then((mode) => {
            setPlaying(false)
            if (mode === 'none') setNotice(t('speech.noVoice'))
          })
        }}
      >
        {formatRate(prefs.speechRate)}
      </button>
    </span>
  )
}
