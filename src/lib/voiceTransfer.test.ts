import assert from 'node:assert/strict'
import test from 'node:test'
import {
  VOICE_TRANSFER_LIMIT_SGD,
  VOICE_TRANSFER_MAX_SGD,
  clampVoiceTransferLimit,
  formatVoiceTransferAmount,
  matchSavedPayee,
  parseVoiceAffirmation,
  invalidVoiceAmount,
  parseVoiceTransfer,
  voiceTransferFields,
} from './voiceTransfer.ts'

const mei = [{ id: 'wei', label: 'Son - Wei Ming (Australia)', name: 'Tan Wei Ming', country: 'Australia', swift: 'CTBAAU2S', account: '0012345678', aliases: ['son', '儿子'] }]
const arif = [{ id: 'siti', label: 'Siti Aminah', name: 'Siti Aminah', country: 'Singapore', account: '81234567', key: 'paynow:81234567' }]

test('parses English, Chinese and Malay transfer phrases', () => {
  assert.deepEqual(parseVoiceTransfer('transfer 50 dollars to Mei'), { amount: 50, payeeQuery: 'Mei' })
  assert.deepEqual(parseVoiceTransfer('send $30 to Arif'), { amount: 30, payeeQuery: 'Arif' })
  assert.deepEqual(parseVoiceTransfer('pay mum 20'), { amount: 20, payeeQuery: 'mum' })
  assert.deepEqual(parseVoiceTransfer('Transfer S$20.50 to Tan Wei Ming'), { amount: 20.5, payeeQuery: 'Tan Wei Ming' })
  assert.deepEqual(parseVoiceTransfer('转50块给Mei'), { amount: 50, payeeQuery: 'Mei' })
  assert.deepEqual(parseVoiceTransfer('给Wei Ming转50元'), { amount: 50, payeeQuery: 'Wei Ming' })
  assert.deepEqual(parseVoiceTransfer('pindahkan 50 kepada Mei'), { amount: 50, payeeQuery: 'Mei' })
  assert.equal(parseVoiceTransfer('what is my balance'), null)
  assert.deepEqual(parseVoiceTransfer('transfer twenty dollars to Siti'), { amount: 20, payeeQuery: 'Siti' })
  assert.deepEqual(parseVoiceTransfer('transfer some money to Siti'), { amount: null, payeeQuery: 'Siti' })
  assert.equal(parseVoiceTransfer('$20.555 to Siti'), null)
  assert.equal(invalidVoiceAmount('transfer -50 to Siti'), true)
  assert.equal(invalidVoiceAmount('0'), true)
  assert.equal(invalidVoiceAmount('0.00'), true)
  assert.deepEqual(parseVoiceTransfer('pay Siti'), { amount: null, payeeQuery: 'Siti' })
  assert.deepEqual(parseVoiceTransfer('can help me pay Siti 15 bucks lah'), { amount: 15, payeeQuery: 'Siti' })
  assert.deepEqual(parseVoiceTransfer('trasnfer 20 to siti'), { amount: 20, payeeQuery: 'siti' })
  assert.deepEqual(parseVoiceTransfer('Pay Siti $25 for lunch'), { amount: 25, payeeQuery: 'Siti', note: 'lunch' })
  assert.deepEqual(parseVoiceTransfer('send money to my son'), { amount: null, payeeQuery: 'my son' })
})

test('keeps a spoken note for the scam check', () => {
  assert.deepEqual(parseVoiceTransfer('transfer 50 dollars to Wei Ming for refund'), {
    amount: 50,
    payeeQuery: 'Wei Ming',
    note: 'refund',
  })
})

test('matches saved payees and rejects unknown names', () => {
  assert.equal(matchSavedPayee('Wei Ming', mei)?.name, 'Tan Wei Ming')
  assert.equal(matchSavedPayee('son', mei)?.id, 'wei')
  assert.equal(matchSavedPayee('儿子', [{ ...mei[0], aliases: ['son', '儿子', '兒子', 'anak lelaki'] }])?.id, 'wei')
  assert.equal(matchSavedPayee('Siti', arif)?.name, 'Siti Aminah')
  assert.equal(matchSavedPayee('John', mei), null)
})

test('builds the real overseas and PayNow forms', () => {
  const overseas = voiceTransferFields(mei[0], 50, undefined, '360')
  assert.equal(overseas.flow, 'overseas')
  assert.equal(overseas.fields.amount, '50.00')
  assert.equal(overseas.fields.swift, 'CTBAAU2S')
  const paynow = voiceTransferFields(arif[0], 20, 'lunch', 'frank')
  assert.equal(paynow.flow, 'paynow')
  assert.equal(paynow.fields.to, '81234567')
  assert.equal(paynow.fields.reference, 'lunch')
})

test('hears yes and no in a few languages', () => {
  assert.equal(parseVoiceAffirmation('yes'), 'yes')
  assert.equal(parseVoiceAffirmation('是'), 'yes')
  assert.equal(parseVoiceAffirmation('tidak'), 'no')
  assert.equal(parseVoiceAffirmation('cancel'), 'no')
  assert.equal(parseVoiceAffirmation('transfer 50 to Mei'), null)
})

test('clamps the voice transfer limit and never exceeds the hard maximum', () => {
  assert.equal(VOICE_TRANSFER_LIMIT_SGD, 200)
  assert.equal(VOICE_TRANSFER_MAX_SGD, 1000)
  assert.equal(clampVoiceTransferLimit(undefined), 200)
  assert.equal(clampVoiceTransferLimit(null), 200)
  assert.equal(clampVoiceTransferLimit('abc'), 200)
  assert.equal(clampVoiceTransferLimit(-5), 200)
  assert.equal(clampVoiceTransferLimit(0), 0)
  assert.equal(clampVoiceTransferLimit('0'), 0)
  assert.equal(clampVoiceTransferLimit(50), 50)
  assert.equal(clampVoiceTransferLimit(100), 100)
  assert.equal(clampVoiceTransferLimit(200), 200)
  assert.equal(clampVoiceTransferLimit(500), 500)
  assert.equal(clampVoiceTransferLimit(1000), 1000)
  assert.equal(clampVoiceTransferLimit(2000), 1000)
  assert.equal(clampVoiceTransferLimit(9999), VOICE_TRANSFER_MAX_SGD)
  assert.ok(clampVoiceTransferLimit(2000) <= VOICE_TRANSFER_MAX_SGD)
  assert.equal(clampVoiceTransferLimit(75), 50)
  assert.equal(clampVoiceTransferLimit(80), 100)
  assert.equal(formatVoiceTransferAmount(50), 'S$50')
  assert.equal(formatVoiceTransferAmount(1000), 'S$1,000')
})
