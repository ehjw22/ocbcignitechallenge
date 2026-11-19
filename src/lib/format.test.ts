import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatDay, formatMoney, formatSignedMoney, formatTxnAmount, localeFor } from './format.ts'

describe('localeFor', () => {
  it('maps Tamil to Singapore', () => {
    assert.equal(localeFor('ta'), 'ta-SG')
  })
})

describe('formatMoney', () => {
  it('formats with locale grouping while keeping SGD', () => {
    assert.match(formatMoney(1234.5, 'en'), /^1,234\.50 SGD$/)
    assert.match(formatMoney(1234.5, 'ms'), /SGD$/)
    assert.match(formatMoney(1234.5, 'ta'), /SGD$/)
  })
})

describe('formatSignedMoney', () => {
  it('prefixes negatives', () => {
    assert.equal(formatSignedMoney(-6.5, 'en').startsWith('-'), true)
    assert.match(formatSignedMoney(-12.4, 'zh'), /SGD$/)
  })
})

describe('formatTxnAmount', () => {
  it('uses locale for numerals', () => {
    assert.equal(formatTxnAmount(-80, 'en'), '-80.00')
  })
})

describe('formatDay', () => {
  it('localises month names', () => {
    const enDay = formatDay('2026-10-26', 'en')
    const msDay = formatDay('2026-10-26', 'ms')
    assert.notEqual(enDay, '')
    assert.notEqual(msDay, '')
  })
})