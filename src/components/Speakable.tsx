import { useEffect, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { SpeakButton } from '@/components/SpeakButton'
import { translate } from '@/i18n'
import { prefetchSpeech, speak, stopSpeaking } from '@/lib/speech'

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
  corner = false,
}: {
  text: string
  auto?: boolean
  label?: string
  hideText?: boolean
  corner?: boolean
}) {
  const { prefs, setNotice } = useApp()
  const t = (key: string, vars?: Record<string, string | number>) => translate(prefs.language, key, vars)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!text) return
    prefetchSpeech(text, { language: prefs.language, rate: prefs.speechRate, dialect: prefs.dialect })
  }, [text, prefs.language, prefs.speechRate, prefs.dialect])

  useEffect(() => {
    if (!auto || !prefs.readAloud || !text) return
    let live = true
    setPlaying(true)
    void speak(text, {
      language: prefs.language,
      rate: prefs.speechRate,
      dialect: prefs.dialect,
    }).then((mode) => {
      if (!live) return
      setPlaying(false)
      if (mode === 'none') setNotice(t(prefs.dialect === 'cantonese' ? 'speech.cantoneseDown' : 'speech.noVoice'))
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
      return
    }
    setPlaying(true)
    const mode = await speak(text, {
      language: prefs.language,
      rate: prefs.speechRate,
      dialect: prefs.dialect,
    })
    setPlaying(false)
    if (mode === 'none') setNotice(t(prefs.dialect === 'cantonese' ? 'speech.cantoneseDown' : 'speech.noVoice'))
  }

  return (
    <span className={corner ? 'flex w-full flex-col items-stretch gap-1' : 'inline-flex items-start gap-2'}>
      {!hideText && <span className={corner ? 'whitespace-pre-wrap' : ''}>{label || text}</span>}
      <span className={corner ? 'self-end' : ''}>
        <SpeakButton playing={playing} onClick={() => void onClick()} listenLabel={t('speech.readAloud')} stopLabel={t('stop')} />
      </span>
    </span>
  )
}
