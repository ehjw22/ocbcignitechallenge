import assert from 'node:assert/strict'
import test from 'node:test'
import { tourBlocksRealPayment } from './tourPayment.ts'

test('tourBlocksRealPayment blocks confirm only in real tour mode', () => {
  assert.equal(tourBlocksRealPayment(true, false), true)
  assert.equal(tourBlocksRealPayment(true, true), false)
  assert.equal(tourBlocksRealPayment(false, false), false)
  assert.equal(tourBlocksRealPayment(false, true), false)
})