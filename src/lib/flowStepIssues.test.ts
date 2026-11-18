import assert from 'node:assert/strict'
import test from 'node:test'
import { hiddenBlockingIssues, stepIssues } from './flowStepIssues.ts'

test('transfer step 0 with valid payee has no hidden blockers', () => {
  const form = { name: 'Lim Ah Kow', bank: 'OCBC', account: '5012345678', amount: '', from: 'frank', when: 'now' }
  const hidden = hiddenBlockingIssues('transfer', form, 100000, 5000, [], 0, 2, ['name', 'bank', 'account'])
  assert.equal(hidden.length, 0)
})

test('normalised S$30 amount has no amount_positive on paynow step 1', () => {
  const form = { proxy: 'mobile', to: '81234567', amount: '30', from: 'frank', when: 'now' }
  const issues = stepIssues('paynow', form, 100000, 5000, [], 1, 2, ['from', 'reference'])
  assert.equal(issues.some((item) => item.code === 'amount_positive'), false)
})