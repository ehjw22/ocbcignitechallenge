import type { IncomingMessage, ServerResponse } from 'node:http'
import { speechSettings } from './env.js'
import { clientIp, readBody, send } from './http.js'
import { rateLimited } from './limit.js'

const MAX_TEXT = 1_200
const TTS_PER_MINUTE = 30
const OUTPUT = 'audio-24khz-48kbitrate-mono-mp3'

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function prosodyRate(rate: number) {
  const pct = Math.round((rate - 1) * 100)
  if (pct === 0) return 'medium'
  return `${pct > 0 ? '+' : ''}${pct}%`
}

function azureVoice(lang: string) {
  const map: Record<string, string> = {
    'en-SG': 'en-SG-LunaNeural',
    'zh-CN': 'zh-CN-XiaoxiaoNeural',
    'zh-TW': 'zh-TW-HsiaoChenNeural',
    'zh-HK': 'zh-HK-HiuMaanNeural',
    'ms-MY': 'ms-MY-YasminNeural',
    'ta-IN': 'ta-IN-PallaviNeural',
    'id-ID': 'id-ID-GadisNeural',
    'vi-VN': 'vi-VN-HoaiMyNeural',
    'th-TH': 'th-TH-PremwadeeNeural',
    'fil-PH': 'fil-PH-BlessicaNeural',
    'ko-KR': 'ko-KR-SunHiNeural',
    'ja-JP': 'ja-JP-NanamiNeural',
    'hi-IN': 'hi-IN-SwaraNeural',
    'bn-IN': 'bn-IN-TanishaaNeural',
  }
  return map[lang] || 'en-SG-LunaNeural'
}

function ssml(lang: string, voice: string, rate: string, text: string) {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}"><prosody rate="${rate}">${escapeXml(text)}</prosody></voice></speak>`
}

async function azureSpeak(region: string, key: string, lang: string, voice: string, rate: string, text: string) {
  const upstream = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-MICROSOFT-OutputFormat': OUTPUT,
    },
    body: ssml(lang, voice, rate, text),
  })
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '')
    console.error('azure tts failed', voice, lang, upstream.status, detail.slice(0, 180))
    return null
  }
  const buf = Buffer.from(await upstream.arrayBuffer())
  return buf.toString('base64')
}

export async function handleTts(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    send(res, 405, { error: 'method' })
    return
  }
  const rawText = await readBody(req)
  if (rawText.length > 8_000) {
    send(res, 413, { error: 'too large' })
    return
  }
  if (rateLimited(`tts:${clientIp(req)}`, TTS_PER_MINUTE)) {
    send(res, 429, { error: 'rate_limited' })
    return
  }
  let raw: { text?: string; lang?: string; rate?: number; dialect?: string }
  try {
    raw = JSON.parse(rawText || '{}') as { text?: string; lang?: string; rate?: number; dialect?: string }
  } catch {
    send(res, 400, { error: 'invalid json' })
    return
  }
  const text = String(raw.text || '')
  if (!text.trim()) {
    send(res, 400, { error: 'missing text' })
    return
  }
  if (text.length > MAX_TEXT) {
    send(res, 400, { error: 'text too long' })
    return
  }
  const rate = prosodyRate(Math.min(1.5, Math.max(0.6, Number(raw.rate) || 1)))
  const cantonese = raw.dialect === 'cantonese'
  const lang = cantonese ? 'zh-HK' : (raw.lang || 'en-SG')
  const voice = cantonese ? 'zh-HK-HiuMaanNeural' : azureVoice(lang)
  const { googleKey, azureKey, region } = speechSettings()
  if (azureKey) {
    const audio = await azureSpeak(region, azureKey, lang, voice, rate, text)
    if (audio) {
      send(res, 200, { audio, provider: 'azure', voice, lang })
      return
    }
    if (cantonese) {
      send(res, 502, { error: 'cantonese_unavailable' })
      return
    }
  }
  if (!cantonese && googleKey) {
    const upstream = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: lang },
        audioConfig: { audioEncoding: 'MP3', speakingRate: Math.min(1.5, Math.max(0.6, Number(raw.rate) || 1)) },
      }),
    })
    const data = (await upstream.json()) as { audioContent?: string }
    if (upstream.ok && data.audioContent) {
      send(res, 200, { audio: data.audioContent, provider: 'google', lang })
      return
    }
    console.error('google tts failed', lang, upstream.status)
  }
  send(res, 501, { error: cantonese ? 'cantonese_unavailable' : 'no tts configured' })
}
