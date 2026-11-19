import assert from 'node:assert/strict'
import test from 'node:test'
import { isAccountSecurityMessage } from './accountSecurity.ts'

test('account security phrasing is recognised', () => {
  assert.equal(isAccountSecurityMessage('I think someone hacked my account'), true)
  assert.equal(isAccountSecurityMessage('transfer $50 to Mei'), false)
})