import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { recommendedTourIds, nextPracticeJourney } from './recommendedTours.ts'
import type { Preferences } from './types.ts'

const base: Preferences = {
  language: 'en',
  textSize: 16,
  boldText: false,
  highContrast: false,
  colourVision: 'default',
  detail: 'full',
  readAloud: false,
  speechRate: 1,
  helpPreference: 'ai',
  theme: 'ocbc',
  accent: '#E30613',
  scheme: 'light',
  backgroundImage: null,
  backgroundOverlay: 0.62,
  contrastWarning: false,
  shortcuts: ['paynow', 'transfer', 'bill'],
  dialect: 'standard',
  spendingInsights: false,
  onboarded: true,
  quizCompleted: true,
  dyslexiaFont: false,
  letterSpacing: 'normal',
  lineHeight: 'normal',
  readingRuler: false,
  easierTapping: false,
  voiceTransferLimit: 200,
  voiceTransferConfirm: 'faceId',
}

describe('recommendedTourIds', () => {
  it('pins paynow for AI help preference', () => {
    assert.ok(recommendedTourIds(base).includes('paynow'))
  })

  it('suggests settings when read aloud is on', () => {
    assert.ok(recommendedTourIds({ ...base, readAloud: true }).includes('settings'))
  })

  it('picks a next journey after practice', () => {
    const next = nextPracticeJourney(base, { paynow: { completedPractice: true } }, 'paynow')
    assert.notEqual(next, 'paynow')
    assert.ok(next)
  })
})