import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeShortcuts } from './languages.ts'

test('drops an unknown rewards shortcut and backfills to six', () => {
  const next = sanitizeShortcuts(['paynow', 'rewards', 'transfer', 'bill', 'cards', 'insights'])
  assert.equal(next.length, 6)
  assert.equal(next.includes('rewards'), false)
  assert.deepEqual(next, ['paynow', 'transfer', 'bill', 'cards', 'insights', 'scan'])
})
