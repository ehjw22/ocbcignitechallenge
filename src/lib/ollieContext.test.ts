import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildOllieContext } from './ollieContext.ts'
import type { Preferences } from './types.ts'

const prefs: Preferences = {
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
  easierTapping: false,
  voiceTransferLimit: 200,
  voiceTransferConfirm: 'faceId',
}

describe('buildOllieContext', () => {
  it('includes payee names only and recent txns', () => {
    const pack = buildOllieContext({
      pathname: '/flow/paynow',
      screen: 'paynow',
      step: 'review',
      prefs,
      payees: [{ id: 'siti', name: 'Siti Aminah', country: 'SG', label: 'PayNow' }],
      txns: [{ id: '1', title: 'NTUC', amount: -50, date: '2026-10-02', accountId: '360' }],
      excluded: new Set(),
      accounts: [],
    })
    assert.deepEqual(pack.payeeNames, ['Siti Aminah'])
    assert.equal(pack.recentTxns.length, 1)
    assert.equal(pack.route, '/flow/paynow')
  })
})