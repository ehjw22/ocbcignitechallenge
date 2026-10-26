export const SPEECH_RATES = [0.6, 0.8, 1, 1.2, 1.5] as const

export function snapRate(value: number) {
  return SPEECH_RATES.reduce((best, rate) => (Math.abs(rate - value) < Math.abs(best - value) ? rate : best), 1 as number)
}

export function formatRate(value: number) {
  const rate = snapRate(value)
  return `${rate === 1 ? '1' : rate}x`
}

export function nextRate(value: number) {
  const current = snapRate(value)
  const index = SPEECH_RATES.indexOf(current as (typeof SPEECH_RATES)[number])
  return SPEECH_RATES[(index + 1) % SPEECH_RATES.length]
}

const RATE_KEYS: Record<string, string> = {
  '0.6': 'verySlow',
  '0.8': 'slow',
  '1': 'normal',
  '1.2': 'fast',
  '1.5': 'veryFast',
}

export function rateKey(value: number) {
  const rate = snapRate(value)
  return RATE_KEYS[String(rate)] || 'normal'
}
