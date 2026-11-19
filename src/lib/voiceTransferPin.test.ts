import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { attemptVoiceTransferPin, DEMO_VOICE_TRANSFER_PIN, VOICE_TRANSFER_PIN_MAX_ATTEMPTS } from './voiceTransferPin.ts'

describe('voiceTransferPin', () => {
  it('accepts demo PIN on first try', () => {
    assert.deepEqual(attemptVoiceTransferPin(DEMO_VOICE_TRANSFER_PIN, 0), { ok: true })
  })

  it('rejects wrong PIN with attempts left', () => {
    assert.deepEqual(attemptVoiceTransferPin('000000', 0), { ok: false, reason: 'wrong', attemptsLeft: 2 })
    assert.deepEqual(attemptVoiceTransferPin('000000', 1), { ok: false, reason: 'wrong', attemptsLeft: 1 })
  })

  it('locks after max failed attempts', () => {
    const last = attemptVoiceTransferPin('000000', VOICE_TRANSFER_PIN_MAX_ATTEMPTS - 1)
    assert.deepEqual(last, { ok: false, reason: 'locked' })
    assert.deepEqual(attemptVoiceTransferPin(DEMO_VOICE_TRANSFER_PIN, VOICE_TRANSFER_PIN_MAX_ATTEMPTS), { ok: false, reason: 'locked' })
  })
})