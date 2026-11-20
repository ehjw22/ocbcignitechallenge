import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clampRulerCenterY,
  clampTextSize,
  normalizeLetterSpacing,
  normalizeLineHeight,
  pointerInsideRoot,
  readingComfortVars,
  rulerBandHeightPx,
  rulerBandTop,
  rulerLocalYFromClient,
  rulerRootScale,
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
    assert.equal(rulerBandHeightPx(16, 'normal'), Math.round(16 * 1.4 * 1.75))
    assert.equal(rulerBandHeightPx(21, 'extraRoomy'), Math.round(21 * 2 * 1.75))
  })

  it('maps scaled pointer Y into root-local coordinates', () => {
    assert.equal(rulerRootScale(844, 844), 1)
    assert.equal(rulerRootScale(422, 844), 0.5)
    assert.equal(rulerLocalYFromClient(300, 100, 1), 200)
    assert.equal(rulerLocalYFromClient(300, 100, 0.5), 400)
    const bandH = 45
    const rootH = 800
    assert.equal(clampRulerCenterY(10, bandH, rootH), bandH / 2)
    assert.equal(clampRulerCenterY(900, bandH, rootH), rootH - bandH / 2)
    assert.equal(clampRulerCenterY(200, bandH, rootH), 200)
    assert.equal(rulerBandTop(100, bandH), 100 - bandH / 2)
    assert.equal(rulerBandTop(5, bandH), 0)
    assert.equal(pointerInsideRoot(50, 50, 0, 0, 100, 100), true)
    assert.equal(pointerInsideRoot(150, 50, 0, 0, 100, 100), false)
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