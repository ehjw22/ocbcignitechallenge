import assert from 'node:assert/strict'
import test from 'node:test'
import { stepIssues } from './flowStepIssues.ts'

test('normalised S$30 amount has no amount_positive on paynow step 1', () => {
  const form = { proxy: 'mobile', to: '81234567', amount: '30', from: 'frank', when: 'now' }
  const issues = stepIssues('paynow', form, 100000, 5000, [], 1, 2, ['from', 'reference'])
  assert.equal(issues.some((item) => item.code === 'amount_positive'), false)
})