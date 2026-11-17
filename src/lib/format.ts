import { amountNumber } from './amount.ts'

export function formatMoney(value: number) {
  const num = new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value))
  return `${num} SGD`
}

export function formatSignedMoney(value: number) {
  const text = formatMoney(Math.abs(value))
  return value < 0 ? `-${text}` : text
}

export function formatDay(iso: string, language = 'en') {
  const day = new Date(`${iso.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(day.getTime())) return iso
  const sameYear = day.getFullYear() === new Date().getFullYear()
  return new Intl.DateTimeFormat(language.startsWith('zh') ? 'zh-CN' : language, {
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  }).format(day)
}

export function formatTxnAmount(value: number) {
  const num = new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value))
  return value < 0 ? `-${num}` : num
}

export function formatSGD(value: number) {
  const abs = Math.abs(value)
  const num = new Intl.NumberFormat('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(abs)
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
