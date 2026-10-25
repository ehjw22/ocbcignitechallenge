import { languageById } from './languages'

type RangeHandler = (start: number, end: number) => void

let currentAudio: HTMLAudioElement | null = null
let token = 0

export function stopSpeaking() {
  token += 1
  window.speechSynthesis?.cancel()
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
}

function voicesReady() {
  const existing = window.speechSynthesis?.getVoices() ?? []
  if (existing.length) return Promise.resolve(existing)
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const finish = () => resolve(window.speechSynthesis.getVoices())
    window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true })
    setTimeout(finish, 400)
  })
}

function matchVoice(voices: SpeechSynthesisVoice[], prefix: string) {
  const wanted = prefix.toLowerCase()
  return (
    voices.find((v) => v.lang.toLowerCase() === wanted) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(wanted)) ||
    voices.find((v) => wanted.startsWith('zh-tw') && v.lang.toLowerCase().startsWith('zh-tw')) ||
    voices.find((v) => wanted.startsWith('zh') && !wanted.startsWith('zh-tw') && v.lang.toLowerCase().startsWith('zh') && !v.lang.toLowerCase().startsWith('zh-tw')) ||
    null
  )
}

export async function speak(
  text: string,
  options: { language: string; rate: number; dialect: string; onRange?: RangeHandler },
): Promise<'device' | 'cloud' | 'none'> {
  stopSpeaking()
  const myToken = token
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean || !window.speechSynthesis) return 'none'
  const lang = languageById(options.language)
  const voices = await voicesReady()
  if (myToken !== token) return 'none'
  const voice = options.dialect === 'cantonese' ? null : matchVoice(voices, lang.voicePrefix)
  if (voice) {
    await new Promise<void>((resolve) => {
      const utter = new SpeechSynthesisUtterance(clean)
      utter.voice = voice
      utter.lang = voice.lang
      utter.rate = options.rate
      utter.onboundary = (event) => {
        if (event.charIndex == null) return
        const length = event.charLength || clean.slice(event.charIndex).split(/\s/)[0].length
        options.onRange?.(event.charIndex, event.charIndex + length)
      }
      utter.onend = () => {
        options.onRange?.(-1, -1)
        resolve()
      }
      utter.onerror = () => resolve()
      window.speechSynthesis.speak(utter)
    })
    return 'device'
  }
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean, lang: lang.bcp47, rate: options.rate, dialect: options.dialect }),
    })
    if (!res.ok) throw new Error('tts')
    const data = (await res.json()) as { audio?: string }
    if (!data.audio || myToken !== token) return 'none'
    const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`)
    currentAudio = audio
    const words = clean.split(/\s+/).filter(Boolean)
    audio.ontimeupdate = () => {
      if (!audio.duration) return
      const index = Math.min(words.length - 1, Math.floor((audio.currentTime / audio.duration) * words.length))
      let cursor = 0
      const parts = clean.split(/(\s+)/)
      let word = 0
      for (const part of parts) {
        if (!part.trim()) {
          cursor += part.length
          continue
        }
        if (word === index) {
          options.onRange?.(cursor, cursor + part.length)
          break
        }
        word += 1
        cursor += part.length
      }
    }
    await new Promise<void>((resolve) => {
      audio.onended = () => {
        options.onRange?.(-1, -1)
        resolve()
      }
      audio.onerror = () => resolve()
      void audio.play().catch(() => resolve())
    })
    return 'cloud'
  } catch {
    const utter = new SpeechSynthesisUtterance(clean)
    utter.lang = lang.bcp47
    utter.rate = options.rate
    window.speechSynthesis.speak(utter)
    return 'none'
  }
}

export function speakableWords(text: string) {
  const parts = text.split(/(\s+)/)
  let word = 0
  return parts.map((part) => {
    if (!part.trim()) return { part, index: -1 }
    const index = word
    word += 1
    return { part, index }
  })
}
