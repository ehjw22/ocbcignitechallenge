import assert from 'node:assert/strict'
import test from 'node:test'

const historyStore: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => historyStore[key] ?? null,
    setItem: (key: string, value: string) => {
      historyStore[key] = value
    },
    removeItem: (key: string) => {
      delete historyStore[key]
    },
  },
  configurable: true,
})

import { assessChatRisk, executeDemoTransfer, transferExpired } from './chatTransfer.ts'
import { voiceTransferFields } from './voiceTransfer.ts'

const john = { id: 'john', label: 'John Tan', name: 'John Tan', country: 'Singapore', account: '91234567', key: 'paynow:91234567' }

test('executeDemoTransfer debits balance like the flow screen', () => {
  const match = voiceTransferFields(john, 20, undefined, 'frank')
  const balances = { frank: 1230.55 }
  const ok = executeDemoTransfer({ match, practice: false, balances, profileId: 'arif', payees: [john], usualTransfer: 80 })
  assert.equal(ok.ok, true)
  if (ok.ok) {
    assert.equal(ok.amount, 20)
    assert.equal(ok.newBalance, 1210.55)
    assert.match(ok.reference, /^DEMO-/)
  }
})

test('executeDemoTransfer in practice does not change balances', () => {
  const match = voiceTransferFields(john, 20, undefined, 'frank')
  const result = executeDemoTransfer({ match, practice: true, balances: { frank: 100 }, profileId: 'arif', payees: [john], usualTransfer: 80 })
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.newBalance, 100)
})

test('executeDemoTransfer fails when funds are insufficient', () => {
  const match = voiceTransferFields(john, 20, undefined, 'frank')
  const fail = executeDemoTransfer({ match, practice: false, balances: { frank: 10 }, profileId: 'arif', payees: [john], usualTransfer: 80 })
  assert.equal(fail.ok, false)
  if (!fail.ok) assert.equal(fail.reason, 'insufficient')
})

test('assessChatRisk flags a large new payee transfer', () => {
  const stranger = { id: 'x', label: 'Unknown', name: 'Unknown Person', country: 'Singapore', account: '89999999' }
  const match = voiceTransferFields(stranger, 250, undefined, 'frank')
  const risk = assessChatRisk(match, [john], 'arif', 80)
  assert.notEqual(risk.level, 'none')
})

test('transferExpires after two minutes', () => {
  assert.equal(transferExpired(Date.now() - 3 * 60 * 1000), true)
  assert.equal(transferExpired(Date.now() - 30 * 1000), false)
})