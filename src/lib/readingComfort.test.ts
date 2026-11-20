import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clampTextSize,
  normalizeLetterSpacing,
  normalizeLineHeight,
  readingComfortVars,
  rulerBandHeightPx,
  textDisplayVars,
} from './readingComfort.ts'

describe('readingComfortVars', () => {
  it('maps letter spacing and line height to CSS variables', () => {
    assert.deepEqual(readingComfortVars({ letterSpacing: 'normal', lineHeight: 'normal' }), {
      '--reading-letter-spacing': '0em',
      '--reading-word-spacing': '0em',
      '--reading-line-height': '1.4',
    })
    assert.deepEqual(readingComfortVars({ letterSpacing: 'wider', lineHeight: 'roomy' }), {
      '--reading-letter-spacing': '0.05em',
      '--reading-word-spacing': '0.1em',
      '--reading-line-height': '1.7',
    })
    assert.deepEqual(readingComfortVars({ letterSpacing: 'widest', lineHeight: 'extraRoomy' }), {
      '--reading-letter-spacing': '0.12em',
      '--reading-word-spacing': '0.15em',
      '--reading-line-height': '2',
    })
  })

  it('normalizes unknown stored values', () => {
    assert.equal(normalizeLetterSpacing('bogus'), 'normal')
    assert.equal(normalizeLineHeight(null), 'normal')
    assert.deepEqual(readingComfortVars({ letterSpacing: 'bogus' as 'normal', lineHeight: 'bogus' as 'normal' }), {
      '--reading-letter-spacing': '0em',
      '--reading-word-spacing': '0em',
      '--reading-line-height': '1.4',
    })
  })

  it('computes ruler band height from text size', () => {
    assert.equal(rulerBandHeightPx(16, 'normal'), Math.round(16 * 1.4 * 2))
    assert.equal(rulerBandHeightPx(21, 'extraRoomy'), Math.round(21 * 2 * 2))
  })

  it('clamps text size to 16–21', () => {
    assert.equal(clampTextSize(14), 16)
    assert.equal(clampTextSize(24), 21)
    assert.equal(clampTextSize(18), 18)
  })

  it('caps heading scale below body growth', () => {
    const small = textDisplayVars(16)
    const large = textDisplayVars(21)
    assert.ok(Number(large['--h1-em']) <= Number(small['--h1-em']))
  })
})