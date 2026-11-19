import { languageById } from './languages'

type RangeHandler = (start: number, end: number) => void
type SpeakOptions = { language: string; rate: number; dialect: string; onRange?: RangeHandler }

let currentAudio: HTMLAudioElement | null = null
let token = 0
const audioCache = new Map<string, string>()
const pending = new Map<string, Promise<string | null>>()

export function stopSpeaking() {
  token += 1
  window.speechSynthesis?.cancel()
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
}

function cacheKey(text: string, options: SpeakOptions) {
  return `${options.dialect}|${options.language}|${options.rate}|${text}`
}

function voicesReady() {
  const existing = window.speechSynthesis?.getVoices() ?? []
  if (existing.length) return Promise.resolve(existing)
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const finish = () => resolve(window.speechSynthesis.getVoices())
    window.speechSynthesis.addEventListener('voiceschanged', finish, { once: true })
    setTimeout(finish, 250)
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

async function fetchAudio(text: string, options: SpeakOptions) {
  const key = cacheKey(text, options)
  const hit = audioCache.get(key)
  if (hit) return hit
  const inflight = pending.get(key)
  if (inflight) return inflight
  const lang = languageById(options.language)
  const job = fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lang: lang.bcp47, rate: options.rate, dialect: options.dialect }),
  })
    .then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as { audio?: string; error?: string }
      if (!res.ok || !data.audio || data.error === 'cantonese_unavailable') return null
      const url = `data:audio/mpeg;base64,${data.audio}`
      audioCache.set(key, url)
      return url
    })
    .catch(() => null)
    .finally(() => pending.delete(key))
  pending.set(key, job)
  return job
}

export function prefetchSpeech(text: string, options: SpeakOptions) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return
  void fetchAudio(clean, voiceOptions(options))
}

function playUrl(url: string, text: string, options: SpeakOptions, myToken: number) {
  if (myToken !== token) return Promise.resolve(false)
  const audio = new Audio(url)
  audio.preload = 'auto'
  currentAudio = audio
  const words = text.split(/\s+/).filter(Boolean)
  audio.ontimeupdate = () => {
    if (!audio.duration || !words.length) return
    const index = Math.min(words.length - 1, Math.floor((audio.currentTime / audio.duration) * words.length))
    let cursor = 0
    const parts = text.split(/(\s+)/)
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
  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (played: boolean) => {
      if (settled) return
      settled = true
      resolve(played)
    }
    audio.onended = () => {
      options.onRange?.(-1, -1)
      finish(true)
    }
    audio.onpause = () => {
      if (myToken !== token) finish(false)
    }
    audio.onerror = () => finish(false)
    void audio.play().then(() => {
      if (myToken !== token) {
        audio.pause()
        finish(false)
      }
    }).catch(() => finish(false))
  })
}

function mostlyLatin(text: string) {
  const letters = text.replace(/\s+/g, '')
  if (!letters.length) return false
  const latin = (letters.match(/[A-Za-z]/g) || []).length
  return latin / letters.length > 0.55
}

async function speakOnDevice(text: string, options: SpeakOptions) {
  const lang = languageById(options.language)
  if (import.meta.env.DEV && mostlyLatin(text) && ['ta', 'th', 'ja', 'ko', 'hi', 'bn', 'zh', 'zh-TW'].includes(options.language)) {
    console.warn('[tts] english-fallback', { language: options.language, sample: text.slice(0, 80) })
  }
  const voices = await voicesReady()
  const voice = matchVoice(voices, lang.voicePrefix)
  await new Promise<void>((resolve) => {
    const utter = new SpeechSynthesisUtterance(text)
    if (voice) utter.voice = voice
    utter.lang = voice?.lang || lang.bcp47
    utter.rate = options.rate
    utter.onboundary = (event) => {
      if (event.charIndex == null) return
      const length = event.charLength || text.slice(event.charIndex).split(/\s/)[0].length
      options.onRange?.(event.charIndex, event.charIndex + length)
    }
    utter.onend = () => {
      options.onRange?.(-1, -1)
      resolve()
    }
    utter.onerror = () => resolve()
    window.speechSynthesis.speak(utter)
  })
}

function voiceOptions(options: SpeakOptions): SpeakOptions {
  return { ...options, dialect: options.dialect === 'cantonese' ? 'cantonese' : 'standard' }
}

export async function speak(text: string, options: SpeakOptions): Promise<'device' | 'cloud' | 'none' | 'cancelled'> {
  stopSpeaking()
  const myToken = token
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return 'none'
  options = voiceOptions(options)
  const url = await fetchAudio(clean, options)
  if (myToken !== token) return 'cancelled'
  if (url) {
    const played = await playUrl(url, clean, options, myToken)
    if (myToken !== token) return 'cancelled'
    return played ? 'cloud' : 'none'
  }
  if (options.dialect === 'cantonese') window.dispatchEvent(new Event('ocbc-cantonese'))
  return 'none'
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
