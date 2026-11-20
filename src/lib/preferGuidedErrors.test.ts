import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { preferGuidedErrors } from './preferGuidedErrors.ts'

describe('preferGuidedErrors', () => {
  it('is true for guide and staff help preferences', () => {
    assert.equal(preferGuidedErrors({ helpPreference: 'guide' }), true)
    assert.equal(preferGuidedErrors({ helpPreference: 'staff' }), true)
    assert.equal(preferGuidedErrors({ helpPreference: 'ai' }), false)
  })
})