import assert from 'node:assert/strict'
import test from 'node:test'
import { flowById } from './../data/flows.ts'
import { guideStepFill } from './guideSync.ts'

test('a real-mode transfer tour fills the review step', () => {
  const flow = flowById('transfer')
  assert.ok(flow)
  const step = guideStepFill(flow, 'review')
  assert.equal(step.wstep, 2)
  assert.equal(step.values.name, 'Tan Wei Ming')
  assert.equal(step.values.account, '1234567890')
  assert.equal(step.values.amount, '50.00')
  assert.ok(Number(guideStepFill(flowById('overseas')!, 'amount').values.amount) < 50)
})

test('overseas practice uses a 10-digit account and a small amount', () => {
  const flow = flowById('overseas')
  assert.ok(flow)
  const step = guideStepFill(flow, 'review')
  assert.equal(step.values.account?.length, 10)
  assert.ok(Number(step.values.amount) < 200)
})
