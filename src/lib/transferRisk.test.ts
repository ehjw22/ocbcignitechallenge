import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBaseline } from './transferBaseline.ts'
import { assessTransferRisk } from './transferRisk.ts'

const meiPayee = [{ name: 'Tan Wei Ming', country: 'Australia', swift: 'CTBAAU2S', account: '12345678' }]

test('small PayNow to a new number stays quiet', () => {
  for (const amount of [12, 199]) {
    const result = assessTransferRisk({
      flowId: 'paynow',
      amount,
      payeeKey: 'paynow:91234567',
      usualTransfer: 80,
      text: 'lunch',
    })
    assert.equal(result.level, 'none')
  }
})

test('refund on a small PayNow is high', () => {
  const result = assessTransferRisk({
    flowId: 'paynow',
    amount: 12,
    payeeKey: 'paynow:91234567',
    text: 'refund',
    usualTransfer: 80,
  })
  assert.equal(result.level, 'high')
  assert.ok(result.reasons.includes('scam-words'))
})

test('S$250 to a new PayNow number is a check', () => {
  const result = assessTransferRisk({
    flowId: 'paynow',
    amount: 250,
    payeeKey: 'paynow:91234567',
    usualTransfer: 80,
  })
  assert.equal(result.level, 'check')
  assert.ok(result.reasons.includes('new-payee-amount'))
})

test('the fifth S$200 to the same new number adds the 24 hour total', () => {
  const history = [1, 2, 3, 4].map((n) => ({ payeeKey: 'paynow:91234567', amount: 200, at: Date.now() - n * 1000 }))
  const fifth = assessTransferRisk({
    flowId: 'paynow',
    amount: 200,
    payeeKey: 'paynow:91234567',
    history,
    usualTransfer: 80,
  })
  assert.equal(fifth.reasons.includes('new-payee-amount'), false)
  assert.ok(fifth.reasons.includes('paid-before'))
  assert.ok(fifth.reasons.includes('new-payee-24h-total'))
  assert.equal(fifth.dayTotal, 1000)
  assert.equal(fifth.level, 'check')
})

test('a first payment of S$1,100 does not mention earlier transfers', () => {
  const result = assessTransferRisk({
    flowId: 'paynow',
    amount: 1100,
    payeeKey: 'paynow:91234567',
    history: [],
    usualTransfer: 80,
  })
  assert.ok(result.reasons.includes('large-amount'))
  assert.ok(result.reasons.includes('new-payee-amount'))
  assert.equal(result.reasons.includes('new-payee-24h-total'), false)
})

test('a hawker QR for S$12 is not a new person', () => {
  const result = assessTransferRisk({ flowId: 'scan', amount: 12, payeeKey: 'merchant:hawker stall 12', usualTransfer: 80 })
  assert.equal(result.level, 'none')
})

test('a saved overseas payee only warns at S$1,000 or more', () => {
  const small = assessTransferRisk({
    flowId: 'overseas',
    amount: 50,
    payeeKey: 'overseas-name:tan wei ming:australia',
    payees: meiPayee,
    usualTransfer: 200,
  })
  assert.equal(small.level, 'none')
  const large = assessTransferRisk({
    flowId: 'overseas',
    amount: 3500,
    payeeKey: 'overseas-name:tan wei ming:australia',
    payees: meiPayee,
    usualTransfer: 200,
  })
  assert.deepEqual(large.reasons, ['large-amount'])
  assert.equal(large.level, 'check')
})

test('a new overseas payee for S$50 is a check', () => {
  const result = assessTransferRisk({
    flowId: 'overseas',
    amount: 50,
    payeeKey: 'overseas-name:ali bin ahmad:malaysia',
    payees: meiPayee,
    usualTransfer: 200,
  })
  assert.equal(result.level, 'check')
  assert.ok(result.reasons.includes('overseas-new-payee'))
})

test('S$6,000 to someone new is high', () => {
  const result = assessTransferRisk({
    flowId: 'paynow',
    amount: 6000,
    payeeKey: 'paynow:90000000',
    usualTransfer: 200,
  })
  assert.equal(result.level, 'high')
})

test('job does not match inside another word', () => {
  const result = assessTransferRisk({ flowId: 'paynow', amount: 12, payeeKey: 'paynow:1', text: 'Jobson jobs', usualTransfer: 80 })
  assert.equal(result.level, 'none')
})

test('mei to john at S$30 stays quiet', () => {
  const history = [30, 40, 35].map((amount, index) => ({
    payeeKey: 'local:john tan:ocbc',
    amount,
    at: Date.now() - (index + 1) * 86_400_000,
    userId: 'mei',
  }))
  const baseline = buildBaseline(history)
  const result = assessTransferRisk({
    flowId: 'transfer',
    amount: 30,
    payeeKey: 'local:john tan:ocbc',
    keys: ['local:john tan:ocbc'],
    history,
    baseline,
    usualTransfer: 200,
  })
  assert.equal(result.level, 'none')
})

test('mei to john at S$1,000 warns with unusual amount', () => {
  const history = [30, 40, 35, 50, 45].map((amount, index) => ({
    payeeKey: 'local:john tan:ocbc',
    amount,
    at: Date.now() - (index + 1) * 86_400_000,
    userId: 'mei',
  }))
  const baseline = buildBaseline(history)
  const result = assessTransferRisk({
    flowId: 'transfer',
    amount: 1000,
    payeeKey: 'local:john tan:ocbc',
    keys: ['local:john tan:ocbc'],
    history,
    baseline,
    usualTransfer: 200,
  })
  assert.ok(result.reasons.includes('unusual-amount'))
  assert.equal(result.level, 'check')
})

test('burst of paynow in 10 minutes warns', () => {
  const now = Date.now()
  const history = [1, 2, 3].map((n) => ({ payeeKey: `paynow:9${n}`, amount: 50, at: now - n * 60_000, userId: 'arif' }))
  const result = assessTransferRisk({
    flowId: 'paynow',
    amount: 200,
    payeeKey: 'paynow:94',
    keys: ['paynow:94'],
    history,
    baseline: buildBaseline(history),
    usualTransfer: 80,
    now,
  })
  assert.ok(result.reasons.includes('burst'))
})
