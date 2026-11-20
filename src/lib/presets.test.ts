import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { patchForPreset } from './presets.ts'

describe('presets', () => {
  it('easy reading uses 19px and high contrast', () => {
    const patch = patchForPreset('easyReading')
    assert.equal(patch.textSize, 19)
    assert.equal(patch.highContrast, true)
    assert.equal(patch.readAloud, true)
    assert.equal(patch.lineHeight, 'roomy')
  })

  it('low vision uses 21px', () => {
    assert.equal(patchForPreset('lowVision').textSize, 21)
  })

  it('dyslexia preset uses 18px reading comfort', () => {
    assert.equal(patchForPreset('dyslexia').textSize, 18)
  })
})