import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { patchForPreset } from './presets.ts'

describe('presets', () => {
  it('easy reading uses 22px and high contrast', () => {
    const patch = patchForPreset('easyReading')
    assert.equal(patch.textSize, 22)
    assert.equal(patch.highContrast, true)
    assert.equal(patch.readAloud, true)
  })
})