import assert from 'node:assert/strict'
import test from 'node:test'
import { extractAmountFromText, formatDraftAmount, formatLiveAmount, normaliseAmount } from './amount.ts'

test('normaliseAmount cleans currency and commas', () => {
  assert.equal(normaliseAmount('S$30.00'), '30')
  assert.equal(normaliseAmount('1,000'), '1000')
  assert.equal(normaliseAmount('1,000.50'), '1000.5')
  assert.equal(normaliseAmount('$20'), '20')
  assert.equal(normaliseAmount('20 dollars'), '20')
  assert.equal(normaliseAmount('100块'), '100')
  assert.equal(normaliseAmount(30), '30')
  assert.equal(normaliseAmount(''), '')
  assert.equal(normaliseAmount('abc'), '')
  assert.equal(normaliseAmount('0'), '')
  assert.equal(normaliseAmount('-5'), '')
  assert.equal(normaliseAmount('1.234'), '')
  assert.equal(normaliseAmount('NaN'), '')
})

test('formatDraftAmount preserves partial decimals while typing', () => {
  assert.equal(formatDraftAmount('1,000.'), '1,000.')
  assert.equal(formatDraftAmount('20.0'), '20.0')
  assert.equal(formatDraftAmount('20.05'), '20.05')
})

test('formatLiveAmount never shows NaN for dirty input', () => {
  const out = formatLiveAmount('S$30')
  assert.ok(!out.includes('NaN'))
  assert.equal(out, '30')
})

test('extractAmountFromText handles thousands and paynow numbers', () => {
  assert.equal(extractAmountFromText('transfer 1,000 to John'), '1000')
  assert.equal(extractAmountFromText('pay 91234567 $20'), '20')
})