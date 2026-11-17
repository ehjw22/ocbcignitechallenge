import assert from 'node:assert/strict'
import test from 'node:test'
import { SPEND_ROWS } from '../data/insights.ts'
import { filterSpendRows, loadExcluded, setExcluded, spendKey } from './insightExclusions.ts'

const store: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
  },
  configurable: true,
})

test('spendKey lines up txn and insight rows', () => {
  const row = SPEND_ROWS[0]
  const key = spendKey(row)
  assert.match(key, /^2026-10-/)
})

test('excluded rows drop out of totals', () => {
  const row = SPEND_ROWS[0]
  const key = spendKey(row)
  setExcluded('mei', key, true)
  const filtered = filterSpendRows(SPEND_ROWS.filter((item) => item.month === '2026-10'), loadExcluded('mei'))
  assert.equal(filtered.includes(row), false)
})

test('exclusions are per user', () => {
  const row = SPEND_ROWS[1]
  const key = spendKey(row)
  setExcluded('arif', key, true)
  assert.equal(loadExcluded('mei').has(key), false)
  assert.equal(loadExcluded('arif').has(key), true)
})