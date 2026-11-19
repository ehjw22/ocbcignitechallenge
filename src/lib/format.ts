import { amountNumber } from './amount.ts'

const LOCALE: Record<string, string> = {
  en: 'en-SG',
  zh: 'zh-CN',
  'zh-TW': 'zh-TW',
  ms: 'ms-MY',
  ta: 'ta-SG',
  id: 'id-ID',
  vi: 'vi-VN',
  th: 'th-TH',
  tl: 'fil-PH',
  ko: 'ko-KR',
  ja: 'ja-JP',
  hi: 'hi-IN',
  bn: 'bn-IN',
}

export function localeFor(language: string) {
  return LOCALE[language] || (language.startsWith('zh') ? 'zh-CN' : 'en-SG')
}

export function formatMoney(value: number, language = 'en') {
  const locale = localeFor(language)
  const num = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value))
  return `${num} SGD`
}

export function formatSignedMoney(value: number, language = 'en') {
  const text = formatMoney(Math.abs(value), language)
  return value < 0 ? `-${text}` : text
}

export function formatDay(iso: string, language = 'en') {
  const day = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(day.getTime())) return iso
  const sameYear = day.getFullYear() === new Date().getFullYear()
  const locale = localeFor(language)
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  }
  if (locale === 'th-TH') options.calendar = 'gregory'
  return new Intl.DateTimeFormat(locale, options).format(day)
}

export function formatTxnAmount(value: number, language = 'en') {
  const locale = localeFor(language)
  const num = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value))
  return value < 0 ? `-${num}` : num
}

export function formatSGD(value: number, language = 'en') {
  const abs = Math.abs(value)
  const locale = localeFor(language)
  const num = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs)
  return `${value < 0 ? '-' : ''}S$${num}`
}

export function parseAmount(raw: string) {
  return amountNumber(raw)
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function redact(text: string) {
  if (/password|\botp\b|\bpin\b|card number|\d{13,}/i.test(text)) return '[redacted]'
  return text.slice(0, 240)
}