import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareDemoUser, personaCustomSummary } from './comparePersona.ts'

describe('comparePersona', () => {
  it('uses demo login prefs for Auntie Mei and Arif', () => {
    const mei = compareDemoUser('auntiemei')
    const arif = compareDemoUser('arif')
    assert.equal(mei.prefs.language, 'zh')
    assert.equal(mei.prefs.helpPreference, 'guide')
    assert.equal(mei.prefs.spendingInsights, false)
    assert.equal(mei.prefs.easierTapping, true)
    assert.equal(mei.prefs.textSize, 20)
    assert.equal(mei.prefs.detail, 'short')
    assert.equal(arif.prefs.language, 'en')
    assert.equal(arif.prefs.detail, 'full')
    assert.equal(arif.prefs.scheme, 'dark')
    assert.equal(arif.prefs.dyslexiaFont, true)
    assert.equal(arif.prefs.spendingInsights, true)
    assert.equal(arif.prefs.letterSpacing, 'wider')
  })

  it('builds a one-line customisation summary', () => {
    const mei = compareDemoUser('auntiemei')
    const summary = personaCustomSummary(mei.prefs, 'Chinese (Simplified)')
    assert.match(summary, /Chinese/)
    assert.match(summary, /Guided step-by-step help/)
    assert.match(summary, /Read aloud on/)
    assert.match(summary, /Spending insights off/)
    const arif = compareDemoUser('arif')
    assert.match(personaCustomSummary(arif.prefs), /Dyslexia-friendly font/)
    assert.match(personaCustomSummary(arif.prefs), /Spending insights on/)
  })
})