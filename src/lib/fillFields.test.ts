import assert from 'node:assert/strict'
import test from 'node:test'
import { DEMO_PAYEE_JOHN } from '../data/demoAccounts.ts'
import { normaliseFillFields } from './fillFields.ts'

const siti = { id: 'siti', label: 'Siti Aminah', name: 'Siti Aminah', country: 'Singapore', account: '81234567', key: 'paynow:81234567' }

test('maps AI paynow payload to form fields', () => {
  const fields = normaliseFillFields('paynow', { mobile: '81234567', amount: 'S$30.00' }, { payees: [siti], depositIds: ['frank', '360'] })
  assert.equal(fields.to, '81234567')
  assert.equal(fields.amount, '30')
  assert.equal(fields.from, 'frank')
  assert.equal(fields.mobile, undefined)
})

test('maps AI transfer payload', () => {
  const fields = normaliseFillFields(
    'transfer',
    { recipient: 'Lim Ah Kow', bank: 'OCBC', account: '5012345678', amount: '1500' },
    { payees: [], depositIds: ['frank'] },
  )
  assert.equal(fields.name, 'Lim Ah Kow')
  assert.equal(fields.account, '5012345678')
  assert.equal(fields.amount, '1500')
  assert.equal(fields.recipient, undefined)
})

test('drops unknown paynow keys', () => {
  const fields = normaliseFillFields('paynow', { mobile: '91234567', amount: '20', foo: 'bar' }, { payees: [DEMO_PAYEE_JOHN], depositIds: ['360'] })
  assert.equal(fields.to, '91234567')
  assert.equal(fields.foo, undefined)
})