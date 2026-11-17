import type { SpendRow } from '../data/insights.ts'
import type { Txn } from './types.ts'

const prefix = 'ocbc-insights-excluded-'

export function spendKey(input: SpendRow | Txn) {
  const date = 'date' in input ? input.date.slice(0, 10) : `${input.month}-${String(input.day).padStart(2, '0')}`
  const merchant = 'merchant' in input ? input.merchant : input.title
  return `${date}|${merchant.toLowerCase()}|${Math.abs(input.amount).toFixed(2)}`
}

export function loadExcluded(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(prefix + userId)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function saveExcluded(userId: string, set: Set<string>) {
  localStorage.setItem(prefix + userId, JSON.stringify([...set]))
}

export function setExcluded(userId: string, key: string, on: boolean) {
  const set = loadExcluded(userId)
  if (on) set.add(key)
  else set.delete(key)
  saveExcluded(userId, set)
  return set
}

const listeners = new Set<() => void>()

export function subscribeExcluded(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyExcluded() {
  listeners.forEach((listener) => listener())
}

export function filterSpendRows(rows: SpendRow[], excluded?: Set<string>) {
  if (!excluded?.size) return rows
  return rows.filter((row) => !excluded.has(spendKey(row)))
}