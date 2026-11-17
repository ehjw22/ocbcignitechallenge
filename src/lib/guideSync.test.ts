import assert from 'node:assert/strict'
import test from 'node:test'
import { OVERSEAS_SAMPLES, flowById } from '../data/flows.ts'
import { guideStepFill, resolveDemoValue } from './guideSync.ts'
import { validateForm } from './validate.ts'

const arif = { accounts: [{ id: 'frank', kind: 'deposit' }] }

test('a real-mode transfer tour fills the review step from Arif\'s account', () => {
  const flow = flowById('transfer')
  assert.ok(flow)
  const step = guideStepFill(flow, 'review', arif)
  assert.equal(step.wstep, 2)
  assert.equal(step.values.name, 'Tan Wei Ming')
  assert.equal(step.values.account, '1234567890')
  assert.equal(step.values.from, 'frank')
  const from = flow.fields.find((field) => field.id === 'from')
  assert.ok(from)
  assert.equal(resolveDemoValue(from, arif), 'frank')
})

test('overseas practice uses a country-correct account', () => {
  const flow = flowById('overseas')
  assert.ok(flow)
  const step = guideStepFill(flow, 'review', arif)
  assert.equal(step.values.account, '12345678')
  assert.equal(step.values.from, 'frank')
  assert.ok(Number(step.values.amount) < 50)
})

test('every overseas sample passes validation for its country', () => {
  for (const [country, sample] of Object.entries(OVERSEAS_SAMPLES)) {
    const issues = validateForm('overseas', {
      name: 'Tan Wei Ming',
      country,
      swift: sample.swift,
      account: sample.account,
      amount: '20.00',
      from: 'frank',
    }, 5000, [])
    const bad = issues.filter((issue) => issue.field === 'account' || issue.field === 'swift' || issue.field === 'country')
    assert.deepEqual(bad, [], country)
  }
})
