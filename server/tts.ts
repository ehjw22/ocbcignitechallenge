import type { IncomingMessage, ServerResponse } from 'node:http'
import { speechSettings } from './env'
import { clientIp, readBody, send } from './http'
import { rateLimited } from './limit'

const MAX_TEXT = 1_200
const TTS_PER_MINUTE = 30

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function azureVoice(lang: string) {
  const map: Record<string, string> = {
    'en-SG': 'en-SG-LunaNeural',
    'zh-CN': 'zh-CN-XiaoxiaoNeural',
    'zh-TW': 'zh-TW-HsiaoChenNeural',
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
  const rate = Math.min(1.5, Math.max(0.6, Number(raw.rate) || 1))
  const cantonese = raw.dialect === 'cantonese'
  const { googleKey, azureKey, region } = speechSettings()
  if (googleKey) {
    const languageCode = cantonese ? 'yue-HK' : (raw.lang || 'en-SG')
    const voiceName = cantonese ? 'yue-HK-Standard-A' : undefined
    const upstream = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: voiceName ? { languageCode, name: voiceName } : { languageCode },
        audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
      }),
    })
    const data = (await upstream.json()) as { audioContent?: string }
    if (upstream.ok && data.audioContent) {
      send(res, 200, { audio: data.audioContent, provider: 'google' })
      return
    }
  }
  if (azureKey) {
    const voice = cantonese ? 'zh-HK-HiuMaanNeural' : azureVoice(raw.lang || 'en-SG')
    const ssml = `<speak version='1.0' xml:lang='${cantonese ? 'zh-HK' : raw.lang || 'en-SG'}'><voice name='${voice}'><prosody rate='${rate.toFixed(1)}'>${escapeXml(text)}</prosody></voice></speak>`
    const upstream = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-MICROSOFT-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
      },
      body: ssml,
    })
    if (upstream.ok) {
      const buf = Buffer.from(await upstream.arrayBuffer())
      send(res, 200, { audio: buf.toString('base64'), provider: 'azure' })
      return
    }
  }
  send(res, 501, { error: 'no tts configured' })
}
